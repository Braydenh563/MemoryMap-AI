# Choosing an AI model

MemoryMap works without any AI at all — you just get keyword search and
`Uncategorised` filing. For auto-filing and chat answers, install
[Ollama](https://ollama.com) and pull a model:

```
ollama pull llama3.2
```

Any Ollama model works, and you can switch between them in-app from
**Settings → Models** without restarting — the same list is there, with a
download button next to each.

**Sorted by size, not by quality**, because the real question is what your
machine can run. Start at the top of the tier that fits your RAM; if answers
feel slow, drop a tier.

## Runs on almost anything — no GPU needed

| Model | Size | Why |
| --- | --- | --- |
| `qwen3.5:2b` | ~1.6 GB | The lightest one genuinely worth using |
| `llama3.2` | ~2.0 GB | **The default.** Fast, and a good first choice |
| `granite4.1:3b` | ~2.1 GB | Strong instruction-following at a small size |
| `qwen3.5:4b` | ~2.6 GB | Follows instructions closely — good for agent mode |
| `gemma4:e2b` | ~3.5 GB | Fast & more reliable. Try it if bigger models are too slow |
| `gemma4:e4b` | ~5 GB | Even more reliable, slightly slower. Noticeably better writing than the 2B models |

## 8 GB of RAM, or any modern GPU — the real step up in answer quality

| Model | Size | Why |
| --- | --- | --- |
| `llama3.1:8b` | ~4.9 GB | Better reasoning, and reliable tool calls in agent mode |
| `qwen3.5:8b` | ~5.2 GB | Best tool use at this size. Thinks, so slower per answer |
| `mistral-nemo` | ~7.1 GB | Long-document work — a large context window |
| `gemma4:12b` | ~7.6 GB | Long-form writing and summarising |

## 16 GB and up — mixture-of-experts

Worth understanding before you skip these on size: `26b-a4b` holds 26B of
weights but computes with only 4B of them at a time, so it downloads like a
big model and *answers* at roughly the speed of a 4B one. If you have the
memory, these are the best answers on this page.

| Model | Size | Why |
| --- | --- | --- |
| `gemma4:26b-a4b` | ~15 GB | 12B-class speed, far better answers. Needs ~16 GB |
| `qwen3.5:35b-a3b` | ~20 GB | The most capable here, and still quick. Needs ~24 GB |

Sizes are Ollama's default quantisation and are approximate. They matter more
than the parameter count: a 7B at Q4 and a 3B at Q8 land in about the same
place on an 8 GB machine.

**For agent mode specifically**, prefer a model Ollama reports as
tool-capable — Settings → Models shows this under "Can use tools", read from
the model itself rather than guessed. `qwen3.5:8b` and `llama3.1:8b` are the
most reliable of the list above; the 2B models can use tools but forget to.

**A small model on a large notebook is fine.** MemoryMap never stuffs the
whole notebook into one prompt — it retrieves a handful of relevant notes
first (keyword or semantic search), so prompt size stays small regardless of
how many notes you have. A smaller model reasons less well about what it's
given; it doesn't choke on notebook size.

*Some of these, and a few others, are also at
[huggingface.co/braydenh563](https://huggingface.co/braydenh563).*

## Not using Ollama?

**Settings → Models → Model backend** points MemoryMap at anything that
serves the OpenAI API instead — **LM Studio**, **llama.cpp**'s server,
**Jan** and **vLLM** are all the same choice, differing only by address.
Pick "LM Studio / llama.cpp / Jan / vLLM", leave the address blank for the
usual one (`localhost:1234/v1`) or fill in your own port, and press Connect.
It applies straight away; no restart, and nothing to put in `.env`.

Everything works the same on either backend — tool calls, streaming,
thinking models, and the token counts on each message. Two differences
worth knowing: downloading models is an Ollama feature (every other server
is handed a model you already have, so that panel hides itself), and Ollama
is the only one that lets the app *ask* for a context window — elsewhere
the window is whatever the server was started with, so MemoryMap reads it
and rations the prompt to fit.

The **embedding** model for semantic search (`BAAI/bge-small-en-v1.5`)
downloads itself the first time it's needed — Settings → Models names
whichever one is actually loaded. No Ollama pull required — and you can
switch to an Ollama embedding model later, with an automatic re-index.
