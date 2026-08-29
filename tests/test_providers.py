"""A second backend, and the parts of it that are easy to get quietly wrong (§6).

The ask was "support LM Studio". What got built is the OpenAI
`/v1/chat/completions` dialect, which LM Studio, llama.cpp, Jan, vLLM and
Ollama's own `/v1` surface all speak — so these tests are about the *dialect*,
not about any one product.

Three things here are not ordinary coverage:

- **The trap §6 named.** `test_context_budget.py` asserts all four Ollama
  generation paths send an options block, because a payload that omits one is
  a model silently running on the backend's defaults — the bug §11a was spent
  fixing. A second provider needs the equivalent assertion or that bug walks
  back in through a different door. It is at the bottom of this file.
- **Streamed tool calls arrive in fragments keyed by index.** Two concurrent
  calls interleave on the wire, and concatenating in arrival order produces one
  unparseable blob. Small models ask for two things at once constantly.
- **`loaded_context_length` beats `max_context_length`.** A 128k model loaded
  at 4k will drop the front of the prompt — the system prompt, the part telling
  it that it has tools — if the app budgets against what it could have held.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from fakes_http import FakeResponse, sse

from memorymap.ai import provider as provider_module
from memorymap.ai.ollama_client import OllamaClient, OllamaError
from memorymap.ai.openai_client import OpenAICompatClient
from memorymap.ai.provider import (
    ProviderError,
    ToolsUnsupportedError,
    context_from_catalog_entry,
    detect_provider,
    first_chat_model,
    known_context,
    normalise_tool_calls,
)


# --- what the app knows about models ----------------------------------------


def test_the_longest_matching_key_wins():
    """`llama3` and `llama3.1` both match `llama3.1:8b` and differ by 16x.
    First-match order would let dictionary insertion decide which one — a 131k
    model budgeted at 8k, or worse, an 8k model budgeted at 131k."""
    assert known_context("llama3.1:8b-instruct-q4_0") == 131072
    assert known_context("llama3:8b") == 8192


def test_a_tag_and_a_registry_prefix_are_not_part_of_the_name():
    """They say how it was quantised and where it came from, not how much
    it holds."""
    assert known_context("hf.co/someone/qwen3:q4_K_M") == known_context("qwen3")


def test_an_unknown_model_says_so_rather_than_guessing():
    """None is a real answer that callers handle. A made-up number would be
    worse than none, because the budget would then scale against something
    nobody verified."""
    assert known_context("some-model-nobody-has-heard-of") is None


def test_a_differently_punctuated_community_import_still_matches_its_family():
    """Reported directly: a chat model failing when it's a community/fine-tuned
    import — a hyphenated 'granite-4.1-3b-uncensored' rather than the Ollama
    library's own 'granite4' naming, the exact shape an `ollama create`d GGUF
    or a Hugging Face pull tends to take. A plain substring match never finds
    `granite4` inside that name at all (there's a hyphen in the way), silently
    falling through to the flat 8k default on a model that actually has a
    131k window — this is the family match, unaffected by how its uploader
    happened to punctuate the name."""
    assert known_context("hf.co/someone/granite-4.1-3b-uncensored-GGUF:latest") == 131072
    assert known_context("Granite 4.1 Uncensored") == 131072
    # Unrelated names must not start matching just because punctuation is
    # ignored — this is squashing separators, not fuzzy matching.
    assert known_context("some-model-nobody-has-heard-of") is None


@pytest.mark.parametrize(
    "field",
    ["context_length", "context_window", "max_context_length", "max_model_len", "max_seq_len"],
)
def test_every_server_spells_the_window_differently(field):
    """LM Studio, vLLM, OpenRouter and llama.cpp each picked a different name
    for the same number, so all of them are read rather than one guessed at."""
    assert context_from_catalog_entry({"id": "m", field: 32768}) == 32768


def test_llama_cpp_nests_the_real_serving_window_under_meta():
    """`n_ctx` is what the server was actually started with (`-c`), which
    beats anything the model file declares."""
    assert context_from_catalog_entry({"id": "m", "meta": {"n_ctx": 4096}}) == 4096


def test_a_zero_window_is_not_a_window():
    assert context_from_catalog_entry({"id": "m", "context_length": 0}) is None
    assert context_from_catalog_entry("not a dict") is None


def test_the_first_chat_model_is_not_an_embedding_model():
    """An OpenAI-shaped `/models` list is unordered and routinely puts an
    embedding model first. "Just use the first one" then picks something that
    cannot hold a conversation, and it fails at the point of asking a question
    rather than at the point of choosing."""
    assert first_chat_model(["text-embedding-ada-002", "qwen3", "whisper-1"]) == "qwen3"


def test_a_list_of_only_embedding_models_still_returns_something():
    """Better a wrong model with a clear failure than None flowing into the
    model manager as if nothing were configured."""
    assert first_chat_model(["nomic-embed-text"]) == "nomic-embed-text"
    assert first_chat_model([]) is None


@pytest.mark.parametrize(
    "url,expected",
    [
        ("http://localhost:11434", "ollama"),
        ("http://localhost:11434/api", "ollama"),
        ("http://localhost:1234/v1", "openai"),
        ("http://localhost:8080/v1", "openai"),
        # Ollama's own OpenAI-compatible surface — the `/v1` wins, because
        # asking for it is a deliberate choice.
        ("http://localhost:11434/v1", "openai"),
    ],
)
def test_the_dialect_is_guessed_from_the_url(url, expected):
    assert detect_provider(url) == expected


# --- the context window -----------------------------------------------------


def test_the_window_the_server_loaded_beats_the_window_it_could_hold():
    """The whole point on LM Studio. A model *capable* of 128k that was loaded
    at 4k drops the front of the prompt — the system prompt, telling it that it
    has tools — if the app budgets against the bigger number."""
    c = OpenAICompatClient(base_url="http://localhost:1234/v1")
    c._catalog = [{"id": "m", "max_context_length": 131072, "loaded_context_length": 4096}]
    assert c.context_length("m") == 4096


def test_a_model_the_catalog_does_not_describe_falls_back_to_what_we_know():
    c = OpenAICompatClient(base_url="http://localhost:1234/v1")
    c._catalog = [{"id": "qwen3"}]
    assert c.context_length("qwen3") == known_context("qwen3")


def test_an_unknown_model_on_a_silent_server_is_budgeted_at_the_default():
    c = OpenAICompatClient(base_url="http://localhost:1234/v1")
    c._catalog = []
    assert c.context_length("mystery-model") is None
    assert c.usable_context("mystery-model") == c.DEFAULT_CONTEXT_TOKENS


def test_a_huge_window_is_still_capped(openai_client):
    """The ceiling is about the KV cache, which is a property of the machine
    rather than of the dialect — so it applies to both providers."""
    openai_client._context_lengths = {"m": 131072}
    assert openai_client.usable_context("m") == OpenAICompatClient.MAX_REQUESTED_CONTEXT


def test_ollama_falls_back_to_the_table_when_api_show_says_nothing():
    """An old Ollama build, or a model whose manifest omits the window. The
    table is a guess and `/api/show` is a fact, so it is only the fallback."""
    c = OllamaClient(base_url="http://127.0.0.1:1")  # nothing listening
    assert c.context_length("llama3.2") == known_context("llama3.2")


# --- translating the conversation -------------------------------------------


def test_a_tool_result_is_addressed_to_the_call_it_answers():
    """Ollama accepts `{"role": "tool", "tool_name": ...}`; the OpenAI shape
    wants a `tool_call_id` matching an id the assistant turn issued. The agent
    keeps writing one dialect and this translates at the boundary."""
    out = OpenAICompatClient._to_openai_messages(
        [
            {"role": "user", "content": "hi"},
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"function": {"name": "search", "arguments": {"q": "x"}}}],
            },
            {"role": "tool", "tool_name": "search", "content": "[]"},
        ]
    )
    call_id = out[1]["tool_calls"][0]["id"]
    assert out[2]["tool_call_id"] == call_id


def test_two_calls_to_the_same_tool_get_their_own_results():
    """Matching by name alone would address both results to the first call,
    and the server rejects a turn that leaves a call unanswered."""
    out = OpenAICompatClient._to_openai_messages(
        [
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"function": {"name": "search", "arguments": {"q": "a"}}},
                    {"function": {"name": "search", "arguments": {"q": "b"}}},
                ],
            },
            {"role": "tool", "tool_name": "search", "content": "first"},
            {"role": "tool", "tool_name": "search", "content": "second"},
        ]
    )
    first_id, second_id = (c["id"] for c in out[0]["tool_calls"])
    assert first_id != second_id
    assert out[1]["tool_call_id"] == first_id
    assert out[2]["tool_call_id"] == second_id


def test_arguments_are_sent_as_a_json_string():
    """The one shape difference that silently 400s if you get it wrong: Ollama
    sends an object here, OpenAI sends a string."""
    out = OpenAICompatClient._to_openai_messages(
        [
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"function": {"name": "n", "arguments": {"a": 1}}}],
            }
        ]
    )
    arguments = out[0]["tool_calls"][0]["function"]["arguments"]
    assert isinstance(arguments, str)
    assert json.loads(arguments) == {"a": 1}


def test_an_assistant_turn_with_calls_sends_null_content_not_empty_string():
    """Some strict servers 400 on an empty string alongside tool_calls."""
    out = OpenAICompatClient._to_openai_messages(
        [{"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "n"}}]}]
    )
    assert out[0]["content"] is None


def test_ordinary_messages_are_stripped_to_the_fields_the_api_knows():
    """The app hangs its own keys off messages; a strict server rejects them."""
    out = OpenAICompatClient._to_openai_messages(
        [{"role": "user", "content": "hi", "internal_marker": True}]
    )
    assert out == [{"role": "user", "content": "hi"}]


# --- vision (ROADMAP.md's largest open item) --------------------------------


def test_openai_dialect_turns_images_into_a_content_array():
    """`image_url.url` accepts the app's own data-URI shape unchanged."""
    out = OpenAICompatClient._to_openai_messages(
        [{"role": "user", "content": "what is this?", "images": ["data:image/png;base64,AAA"]}]
    )
    assert out == [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "what is this?"},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAA"}},
            ],
        }
    ]


def test_openai_dialect_omits_the_text_part_when_there_is_none():
    out = OpenAICompatClient._to_openai_messages(
        [{"role": "user", "content": "", "images": ["data:image/png;base64,AAA"]}]
    )
    assert out[0]["content"] == [{"type": "image_url", "image_url": {"url": "data:image/png;base64,AAA"}}]


def test_ollama_dialect_strips_the_data_uri_prefix():
    """Ollama's `/api/chat` wants bare base64 and sniffs the format itself."""
    out = OllamaClient._to_ollama_messages(
        [{"role": "user", "content": "what is this?", "images": ["data:image/png;base64,AAA"]}]
    )
    assert out == [{"role": "user", "content": "what is this?", "images": ["AAA"]}]


def test_ollama_dialect_leaves_messages_without_images_untouched():
    messages = [{"role": "user", "content": "hi"}]
    assert OllamaClient._to_ollama_messages(messages) == messages


def test_a_bare_base64_string_survives_the_ollama_dialect_too():
    """Defensive: something that was never a data URI shouldn't be mangled."""
    out = OllamaClient._to_ollama_messages([{"role": "user", "content": "x", "images": ["AAA"]}])
    assert out[0]["images"] == ["AAA"]


# --- streaming --------------------------------------------------------------


def test_a_streamed_answer_arrives_in_pieces(openai_client, capture_post):
    capture_post.queue.append(
        FakeResponse(
            lines=sse(
                {"choices": [{"delta": {"content": "Hel"}}]},
                {"choices": [{"delta": {"content": "lo"}}]},
                {"choices": [{"delta": {}}], "usage": {"prompt_tokens": 7, "completion_tokens": 2}},
            )
        )
    )
    pieces = list(openai_client.chat_stream("m", [{"role": "user", "content": "hi"}]))
    assert [p["content_delta"] for p in pieces if "content_delta" in p] == ["Hel", "lo"]
    stats = [p["stats"] for p in pieces if "stats" in p][0]
    assert stats["prompt_tokens"] == 7 and stats["output_tokens"] == 2


def test_think_tags_still_split_on_the_new_transport(openai_client, capture_post):
    """The splitter sits above the wire format and needed no change — the
    split is kept at "parse one chunk" precisely so it wouldn't."""
    capture_post.queue.append(
        FakeResponse(
            lines=sse(
                {"choices": [{"delta": {"content": "<think>hmm"}}]},
                {"choices": [{"delta": {"content": "</think>Answer"}}]},
            )
        )
    )
    pieces = list(openai_client.chat_stream("m", [{"role": "user", "content": "hi"}]))
    assert "".join(p.get("thinking_delta", "") for p in pieces) == "hmm"
    assert "".join(p.get("content_delta", "") for p in pieces) == "Answer"


def test_reasoning_content_is_thinking_too(openai_client, capture_post):
    """DeepSeek-R1 and several servers send thinking as its own field rather
    than as inline tags — the same distinction Ollama's `thinking` draws."""
    capture_post.queue.append(
        FakeResponse(
            lines=sse(
                {"choices": [{"delta": {"reasoning_content": "weighing it up"}}]},
                {"choices": [{"delta": {"content": "Yes"}}]},
            )
        )
    )
    pieces = list(openai_client.chat_stream("m", [{"role": "user", "content": "hi"}]))
    assert any(p.get("thinking_delta") == "weighing it up" for p in pieces)


def test_streamed_tool_call_fragments_are_reassembled_by_index(openai_client, capture_post):
    """The piece with no Ollama equivalent. Arguments arrive as a partial JSON
    string spread over many chunks, and two concurrent calls interleave — the
    index is the only thing tying a fragment to the call it belongs to."""
    capture_post.queue.append(
        FakeResponse(
            lines=sse(
                {"choices": [{"delta": {"tool_calls": [
                    {"index": 0, "id": "a", "function": {"name": "search", "arguments": '{"q"'}},
                    {"index": 1, "id": "b", "function": {"name": "create", "arguments": '{"te'}},
                ]}}]},
                {"choices": [{"delta": {"tool_calls": [
                    {"index": 1, "function": {"arguments": 'xt":"n"}'}},
                    {"index": 0, "function": {"arguments": ':"x"}'}},
                ]}}]},
            )
        )
    )
    final = [p["final"] for p in openai_client.chat_tools_stream("m", [], []) if "final" in p][0]
    assert final["tool_calls"] == [
        {"name": "search", "arguments": {"q": "x"}},
        {"name": "create", "arguments": {"text": "n"}},
    ]


def test_calls_come_back_in_the_order_the_model_asked_for_them(openai_client, capture_post):
    """A model that says "search, then create" means it, and arrival order of
    the last fragment is not that order."""
    capture_post.queue.append(
        FakeResponse(
            lines=sse(
                {"choices": [{"delta": {"tool_calls": [
                    {"index": 1, "function": {"name": "second", "arguments": "{}"}},
                ]}}]},
                {"choices": [{"delta": {"tool_calls": [
                    {"index": 0, "function": {"name": "first", "arguments": "{}"}},
                ]}}]},
            )
        )
    )
    final = [p["final"] for p in openai_client.chat_tools_stream("m", [], []) if "final" in p][0]
    assert [c["name"] for c in final["tool_calls"]] == ["first", "second"]


def test_a_keepalive_line_is_not_fatal(openai_client, capture_post):
    """Servers send comments and blank frames; a parse failure mid-answer
    must not lose the answer."""
    capture_post.queue.append(
        FakeResponse(
            lines=[": ping", "", "data: not json", 'data: {"choices":[{"delta":{"content":"ok"}}]}', "data: [DONE]"]
        )
    )
    pieces = list(openai_client.chat_stream("m", [{"role": "user", "content": "hi"}]))
    assert "".join(p.get("content_delta", "") for p in pieces) == "ok"


def test_a_model_without_tool_support_is_a_gap_not_an_outage(openai_client, capture_post):
    """Plain Q&A still works, so the agent falls back rather than failing the
    chat — the same distinction the Ollama path draws."""
    capture_post.queue.append(
        FakeResponse(status=400, text="This model does not support tools")
    )
    with pytest.raises(ToolsUnsupportedError):
        list(openai_client.chat_tools_stream("m", [], []))


def test_an_unreachable_server_raises_the_error_the_routes_already_catch(openai_client, capture_post):
    """`OllamaError` IS the neutral error, aliased. Every `except OllamaError`
    in the routes was written to mean "the AI backend failed", and a new parent
    class would have quietly stopped them firing for the second provider."""
    import requests

    capture_post.queue.append(FakeResponse(status=500, text="boom"))
    with pytest.raises(OllamaError):
        openai_client.chat("m", [{"role": "user", "content": "hi"}])
    assert OllamaError is ProviderError
    assert issubclass(ToolsUnsupportedError, OllamaError)
    assert issubclass(requests.HTTPError, Exception)  # sanity


def test_both_dialects_normalise_tool_calls_the_same_way():
    """Ollama models are inconsistent among themselves and some already sent
    arguments as a string, which is why this handled both before there was a
    second provider. One dialect fewer to add."""
    as_object = normalise_tool_calls([{"function": {"name": "n", "arguments": {"a": 1}}}])
    as_string = normalise_tool_calls([{"function": {"name": "n", "arguments": '{"a": 1}'}}])
    assert as_object == as_string == [{"name": "n", "arguments": {"a": 1}}]


def test_unparseable_arguments_do_not_take_the_turn_down():
    assert normalise_tool_calls([{"function": {"name": "n", "arguments": "{oops"}}]) == [
        {"name": "n", "arguments": {}}
    ]


# --- the factory ------------------------------------------------------------


def test_the_provider_preference_chooses_the_client(app_state):
    from memorymap.core import deps

    app_state.set_preference("llm_provider", "openai")
    app_state.set_preference("llm_base_url", "")
    assert isinstance(deps.build_llm_client(app_state), OpenAICompatClient)

    app_state.set_preference("llm_provider", "ollama")
    assert isinstance(deps.build_llm_client(app_state), OllamaClient)


def test_an_empty_base_url_means_the_default_for_that_provider(app_state):
    from memorymap.core import deps

    app_state.set_preference("llm_provider", "openai")
    app_state.set_preference("llm_base_url", "")
    assert deps.build_llm_client(app_state).base_url == deps.DEFAULT_BASE_URLS["openai"]


def test_a_typo_in_the_preferences_file_costs_the_setting_not_the_app(app_state):
    """It is a JSON file the user is invited to edit by hand."""
    from memorymap.core import deps

    app_state.set_preference("llm_provider", "lmstudio-ish-nonsense")
    assert isinstance(deps.build_llm_client(app_state), OllamaClient)


def test_the_ollama_env_var_still_wins_when_no_url_is_set(app_state):
    """`OLLAMA_URL` predates this setting, so it stays the default for that
    path rather than being overwritten by an empty preference."""
    from memorymap.core import deps

    app_state.set_preference("llm_provider", "ollama")
    app_state.set_preference("llm_base_url", "")
    assert deps.build_llm_client(app_state).base_url == app_state.ollama_url.rstrip("/")


# --- the trap §6 named ------------------------------------------------------


def test_every_generation_path_sends_the_output_cap(openai_client, capture_post):
    """The equivalent of `test_context_budget.test_every_generation_path_sends_the_options`,
    for the second provider.

    §6 called this out by name: a new provider needs an assertion of its own or
    it runs on the backend's defaults — which is the bug §11a was spent fixing,
    arriving again through a different door. Asserted against the payloads that
    actually went out rather than against the source text, because the point is
    what the server receives.
    """
    capture_post.queue.extend(
        [
            FakeResponse(payload={"choices": [{"message": {"content": "hi"}}]}),
            FakeResponse(lines=sse({"choices": [{"delta": {"content": "hi"}}]})),
            FakeResponse(payload={"choices": [{"message": {"content": "hi"}}]}),
            FakeResponse(lines=sse({"choices": [{"delta": {"content": "hi"}}]})),
        ]
    )
    messages = [{"role": "user", "content": "hi"}]
    openai_client.chat("m", messages)
    list(openai_client.chat_stream("m", messages))
    openai_client.chat_tools("m", messages, [])
    list(openai_client.chat_tools_stream("m", messages, []))

    assert len(capture_post.sent) == 4
    for call in capture_post.sent:
        assert call["json"]["max_tokens"] > 0, call["url"]


def test_there_is_no_num_ctx_to_send(openai_client):
    """The window is fixed when the server loads the model, so unlike Ollama
    there is nothing to ask for — only something to discover and ration
    against. Sending Ollama's spelling here would be silently ignored, which
    reads as working."""
    options = openai_client.runtime_options("m")
    assert "num_ctx" not in options
    assert "num_predict" not in options
    assert options["max_tokens"] > 0


def test_the_neutral_budget_is_the_same_question_for_both_providers():
    """§6: either each provider translates a neutral
    `{context_tokens, max_output_tokens}`, or it owns the whole payload — and
    the agent should not learn four dialects."""
    ollama = OllamaClient(base_url="http://127.0.0.1:1")
    openai = OpenAICompatClient(base_url="http://127.0.0.1:1/v1")
    ollama._context_lengths = openai._context_lengths = {"m": 8192}
    openai._catalog = []
    assert ollama.generation_budget("m") == openai.generation_budget("m")


def test_the_agent_can_ask_any_provider_for_its_window():
    """`agent.run_agent` reaches `usable_context` through `getattr` so that a
    provider which cannot answer degrades instead of crashing the turn. Both
    of ours answer, and the base class is what guarantees it."""
    for cls in (OllamaClient, OpenAICompatClient):
        assert callable(getattr(cls, "usable_context", None))
        assert issubclass(cls, provider_module.Provider)


def test_the_shared_helpers_are_still_importable_from_the_old_place():
    """They moved to `ai/provider.py` and are re-exported. Tests and modules
    that already import them from `ollama_client` keep working."""
    from memorymap.ai import ollama_client

    for name in ("extract_text_tool_calls", "split_thinking", "_ThinkTagSplitter"):
        assert hasattr(ollama_client, name)


def test_the_moved_helpers_were_moved_and_not_copied():
    """A copy is the failure mode this refactor exists to avoid — two gates
    that drift apart, and a tool-call bug fixed in one dialect and not the
    other."""
    source = Path("src/memorymap/ai/ollama_client.py").read_text(encoding="utf-8")
    assert "class _ToolTextGate" not in source
    assert "def extract_text_tool_calls" not in source


# --- retrying a transient 5xx (reported live: a chat call and a captioning
# call both failing on a plain 500 and succeeding on the exact resend) ------


def _queued_post(monkeypatch, target, responses):
    """Monkeypatch `target.requests.post` to hand back `responses` in order,
    one per call — the shape both retry tests below need: a first call that
    fails, a second that doesn't."""
    calls = {"n": 0}
    queue = list(responses)

    def fake_post(*args, **kwargs):
        calls["n"] += 1
        return queue.pop(0)

    monkeypatch.setattr(f"{target}.requests.post", fake_post)
    return calls


def _skip_show_probe(client, model="m"):
    """`chat`'s options block calls `context_length`, which calls `show` —
    a separate `/api/show` POST, cached per model. Pre-filling the cache
    keeps these retry tests' fake_post queues counting only the `/api/chat`
    calls they actually mean to test."""
    client._context_lengths[model] = None
    client._shown[model] = {}


def test_ollama_chat_retries_once_on_a_transient_500(monkeypatch):
    calls = _queued_post(
        monkeypatch,
        "memorymap.ai.ollama_client",
        [
            FakeResponse(status=500, text="Internal Server Error"),
            FakeResponse(payload={"message": {"content": "hi"}}),
        ],
    )
    client = OllamaClient(base_url="http://127.0.0.1:1")
    _skip_show_probe(client)
    result = client.chat("m", [{"role": "user", "content": "hi"}])
    assert result["content"] == "hi"
    assert calls["n"] == 2


def test_ollama_chat_does_not_retry_a_non_transient_4xx(monkeypatch):
    """A 400 (bad request, model not found) means retrying changes nothing —
    only a 5xx from the backend itself is worth a silent resend."""
    calls = _queued_post(
        monkeypatch,
        "memorymap.ai.ollama_client",
        [FakeResponse(status=400, text="model not found")],
    )
    client = OllamaClient(base_url="http://127.0.0.1:1")
    _skip_show_probe(client)
    with pytest.raises(OllamaError):
        client.chat("m", [{"role": "user", "content": "hi"}])
    assert calls["n"] == 1


def test_ollama_chat_gives_up_after_a_second_500(monkeypatch):
    """One retry, not an infinite loop — a backend still down on the resend
    should fail exactly like it always has."""
    calls = _queued_post(
        monkeypatch,
        "memorymap.ai.ollama_client",
        [
            FakeResponse(status=500, text="Internal Server Error"),
            FakeResponse(status=500, text="Internal Server Error"),
        ],
    )
    client = OllamaClient(base_url="http://127.0.0.1:1")
    _skip_show_probe(client)
    with pytest.raises(OllamaError):
        client.chat("m", [{"role": "user", "content": "hi"}])
    assert calls["n"] == 2


def test_ollama_chat_stream_retries_once_on_a_transient_500(monkeypatch):
    # Ollama's own dialect: one raw JSON object per line, no `data:` prefix
    # (that's the OpenAI/`sse()` shape, which chat_stream never parses).
    line = json.dumps({"message": {"content": "hi"}, "done": True})
    calls = _queued_post(
        monkeypatch,
        "memorymap.ai.ollama_client",
        [
            FakeResponse(status=500, text="Internal Server Error"),
            FakeResponse(lines=[line]),
        ],
    )
    client = OllamaClient(base_url="http://127.0.0.1:1")
    _skip_show_probe(client)
    pieces = list(client.chat_stream("m", [{"role": "user", "content": "hi"}]))
    assert any(p.get("content_delta") == "hi" for p in pieces)
    assert calls["n"] == 2


def test_openai_chat_retries_once_on_a_transient_500(capture_post, openai_client):
    capture_post.queue.extend(
        [
            FakeResponse(status=500, text="Internal Server Error"),
            FakeResponse(payload={"choices": [{"message": {"content": "hi"}}]}),
        ]
    )
    result = openai_client.chat("m", [{"role": "user", "content": "hi"}])
    assert result["content"] == "hi"
    assert len(capture_post.sent) == 2
