"""The code panel's assistant (INBOX 788; DOCUMENTS_PLAN "Placed from INBOX,
2026-10-10 (code as documents)").

The owner: "a way to better interact with the ai as a coding asistant like in
vs code??". Five asks over a code document's selection or whole file:
explain it, answer a question about it, fix the current diagnostic, write
tests for it, refactor it. The last three (and a question whose answer is a
change) come back as code the client shows as a diff to apply or reject;
nothing here writes into the document.

**One provider path.** The model is the documents feature's
(`ModelManager.for_feature("documents")`), reached through the same
`deps.get_ollama()` backend the document AI panel's `/ai-edit` uses, one
non-streamed `chat` turn. With no backend answering, `tool_fallback.for_tools`
offers the needle extra when it is installed: needle writes no prose, so it
only chooses one of the panel's own deterministic tools (`TOOLS`), which the
client runs. With neither, the answer says plainly what needs a model; the
panel's tool buttons work regardless.
"""

from __future__ import annotations

import re

from memorymap.ai import offline, tool_fallback
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaError
from memorymap.ai.provider import Provider

ACTIONS = ("ask", "explain", "fix", "tests", "refactor")
#: The asks whose answer is code, applied as a change.
CODE_ACTIONS = frozenset({"fix", "tests", "refactor"})
#: A file past this is sent as its first part: a small model's window.
MAX_CODE_CHARS = 24_000

SYSTEM = (
    "You are a coding assistant inside a code editor. You are given code from "
    "one file and a task. Be brief and exact, keep the file's style, and never "
    "invent a library call."
)

_TASKS = {
    "explain": "Explain what this code does, in short plain sentences. Name anything surprising or wrong.",
    "ask": "Answer the question about this code. If the answer is a change, give the whole changed code in one fenced block.",
    "fix": "Fix the problem below. Reply with the whole corrected code in one fenced block, then one sentence on what changed.",
    "tests": "Write tests for this code using {harness}. Reply with only the new test code in one fenced block, ready to add at the end of the file.",
    "refactor": "Make this code clearer without changing what it does. Reply with the whole new code in one fenced block, then one sentence on what changed.",
}

#: The test style the run panel runs (run-tests.js), per language.
_HARNESS = {
    "py": "unittest.TestCase classes or plain test_ functions with assert",
    "js": "describe, it and expect (Jest style, no imports)",
    "ts": "describe, it and expect (Jest style, no imports)",
}

#: The panel's deterministic tools, offered to needle when no model answers.
#: Each runs in the browser (documents-codekit.js, `docAssistTool`).
TOOLS = [
    {"type": "function", "function": {
        "name": "format_code", "description": "Format the file or the selected lines.",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {
        "name": "quick_fix", "description": "Apply the quick fix for the problem at the caret.",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {
        "name": "run_tests", "description": "Run the tests in this file.",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {
        "name": "run_file", "description": "Run this file and show its output.",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {
        "name": "find_usages", "description": "List every use of a name in this file.",
        "parameters": {"type": "object", "properties": {"name": {"type": "string", "description": "the name to find"}},
                       "required": ["name"]}}},
]
TOOL_NAMES = frozenset(t["function"]["name"] for t in TOOLS)

NEEDS_MODEL = (
    "Explaining, fixing, writing tests and refactoring need a model. The "
    "panel's tools work without one: Quick fix, Format, Run tests and Find usages."
)

_FENCE = re.compile(r"```[^\n`]*\n(.*?)```", re.S)


def fenced_code(reply: str) -> str | None:
    """The first fenced block's body, or None when the reply has none."""
    match = _FENCE.search(reply or "")
    if not match:
        return None
    body = match.group(1)
    return body if body.endswith("\n") else body + "\n"


def build_messages(action: str, language: str, code: str, question: str = "", diagnostic: str = "") -> list[dict]:
    task = _TASKS[action].format(harness=_HARNESS.get(language, "the usual test style for this language"))
    parts = [f"TASK: {task}"]
    if question.strip():
        parts.append(f"QUESTION: {question.strip()}")
    if diagnostic.strip():
        parts.append(f"PROBLEM: {diagnostic.strip()}")
    parts.append(f"LANGUAGE: {language}\nCODE:\n```{language}\n{code[:MAX_CODE_CHARS]}\n```")
    return [{"role": "system", "content": SYSTEM}, {"role": "user", "content": "\n\n".join(parts)}]


def _from_model(action: str, reply: str) -> dict:
    text = (reply or "").strip()
    code = fenced_code(text)
    if action in CODE_ACTIONS and code is None and text:
        #: A model that forgot the fence answered with the code alone.
        code = text + ("" if text.endswith("\n") else "\n")
    note = _FENCE.sub("", text).strip() if code is not None else text
    return {"kind": "change" if code is not None else "answer", "text": note, "code": code}


def _from_tools(provider: Provider, model: str, action: str, question: str) -> dict:
    ask = question.strip() or {"fix": "fix the problem here", "tests": "run the tests", "refactor": "format the code"}.get(action, "")
    if not ask:
        return {"kind": "needs_model", "text": NEEDS_MODEL}
    reply = provider.chat_tools(model, [{"role": "user", "content": ask}], TOOLS)
    for call in reply.get("tool_calls") or []:
        if call.get("name") in TOOL_NAMES and not call.get("invalid_arguments"):
            return {"kind": "tool", "tool": call["name"], "args": call.get("arguments") or {}, "text": ""}
    return {"kind": "needs_model", "text": NEEDS_MODEL}


def answer(
    action: str,
    language: str,
    code: str,
    model_manager: ModelManager,
    backend: Provider,
    question: str = "",
    diagnostic: str = "",
) -> dict:
    """`{kind, text, code?, tool?, args?, answered_by}`: `answer` is prose,
    `change` is code to show as a diff, `tool` is one of `TOOLS` for the
    client to run, `needs_model` says what a model would add."""
    if backend.is_running():
        try:
            reply = backend.chat(model_manager.chat_model(), build_messages(action, language, code, question, diagnostic))
        except OllamaError:
            return {"kind": "needs_model", "text": offline.offline_message(NEEDS_MODEL), "answered_by": None}
        return {**_from_model(action, reply.get("content") or ""), "answered_by": model_manager.chat_model()}
    provider = tool_fallback.for_tools(backend)
    if provider is None:
        return {"kind": "needs_model", "text": NEEDS_MODEL, "answered_by": None}
    return {**_from_tools(provider, model_manager.chat_model(), action, question), "answered_by": "needle (tools only)"}
