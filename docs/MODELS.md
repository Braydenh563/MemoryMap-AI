# Choosing an AI model

MemoryMap works without an AI model: you still get keyword search and `Uncategorised` filing. For automatic filing and chat answers, install [Ollama](https://ollama.com) and pull a model:

```bash
ollama pull llama3.2
```

Any Ollama chat model can be selected in **Settings → Models**. The list is live: each model can show whether it supports tools, thinking, or vision based on the model metadata rather than on a hard-coded guess.

This guide is sorted primarily by the memory needed to run a model, not by benchmark rank. The numbers below are approximate **Q4 download sizes** for common Ollama/GGUF builds. A download is not the same thing as the amount of RAM required: leave room for the runtime, context window, operating system, and (for multimodal models) vision components. As a practical rule, budget roughly 1.3–1.8× the file size for comfortable CPU/unified-memory use, and more for long contexts.

## Quick picks

| If you have… | Start with… | Why |
| --- | --- | --- |
| 4–8 GB total memory | `qwen3.5:2b`, `llama3.2`, `gemma4:e2b` | Small, fast, useful for filing and short answers |
| 8 GB memory | `qwen3.5:4b`, `gemma4:e4b` | Better instruction following without a large footprint |
| 16 GB memory | `qwen3.5:9b`, `llama3.1:8b`, `gemma4:12b` | The best general-purpose tier for many laptops |
| 24 GB memory | `qwen3.5:27b`, `gemma4:26b-a4b` | A major quality step; the MoE model is relatively fast once loaded |
| 32 GB or more | `qwen3.5:35b-a3b`, larger Qwen/Gemma builds | Stronger reasoning and tool use, with slower startup and more memory use |

There is no single “best” model. For MemoryMap, retrieval keeps prompts short, so a smaller model can work well for filing. Chat quality, planning, coding, and tool use benefit much more from the larger tiers.

## Small models: about 2–6 GB

These are the safest choices for ordinary laptops and CPU-only systems.

| Model | Approx. Q4 size | Strengths | Caveats |
| --- | ---: | --- | --- |
| `qwen3.5:0.8b` | ~0.6 GB | Extremely light classification and simple filing | Weak chat and planning |
| `qwen3.5:2b` | ~1.6 GB | Good small-model instruction following; thinking/tool-capable variants may be available | Can forget tool schemas or lose multi-step context |
| `llama3.2` / `llama3.2:3b` | ~2.0 GB | Fast, stable default; good ecosystem | Older than the newest small families |
| `granite4.1:3b` | ~2–3 GB | Strong structured instruction following | Less general ecosystem support |
| `qwen3.5:4b` | ~2.6–4 GB | Strong small general model; useful for agent mode and multimodal tasks where supported | Quality depends on the exact quantisation/tag |
| `gemma4:e2b` | ~3–4 GB | Fast, capable, and designed for reasoning/agentic workloads | Effective size is not the same as total loaded parameter count |
| `gemma4:e4b` | ~5 GB | Better writing and reliability than the smallest models | Slower and needs more working memory |
| `phi4-mini` | ~2.5–3 GB | Compact Microsoft model for concise answers and coding | Check the exact local build and tool support |

For a small machine, start with `llama3.2` or `qwen3.5:2b`. If tool calls matter, prefer a model whose Settings entry explicitly reports **Can use tools** and test it with a short task before making it your default.

## Mainstream models: about 5–10 GB

This tier is usually the best balance for an 8–16 GB laptop or a modest GPU.

| Model | Approx. Q4 size | Best use | Notes |
| --- | ---: | --- | --- |
| `llama3.1:8b` | ~5–6 GB | Stable general chat, filing, and tool use | Mature and widely supported |
| `qwen3.5:9b` | ~6–7 GB | General chat, coding, reasoning, and multimodal work where supported | Stronger than most 8B-class baselines |
| `qwen3:8b` | ~5–6 GB | Thinking and tool-use experiments | Useful fallback if the newer family is unavailable |
| `gemma4:12b` | ~7–9 GB | Writing, summarising, reasoning, and vision where supported | Needs roughly 16 GB system memory for a comfortable experience |
| `mistral-nemo` | ~7–8 GB | Long documents and general chat | Large context is useful only if the server actually exposes it |
| `qwen2.5-coder:7b` | ~4–5 GB | Coding and structured text transformation | A specialist, not always the best conversational model |
| `deepseek-r1:7b` | ~4–5 GB | Reasoning-heavy prompts when slower responses are acceptable | Thinking can be slower and unnecessarily verbose for filing |

Q4 sizes vary with `Q4_K_M`, `Q4_0`, imatrix builds, metadata, and whether a vision projector is bundled. Treat the table as planning guidance, then check the exact Ollama tag before downloading.

## Larger and MoE models: 12–30 GB

Mixture-of-experts (MoE) models contain many total parameters but activate only a subset per token. They can answer at closer to the active-parameter speed, but the complete quantised weights still need to be loaded.

| Model | Approx. Q4 size | Practical memory target | Best use |
| --- | ---: | --- | --- |
| `gemma4:26b-a4b` | ~15–17 GB | 24 GB minimum; 32 GB more comfortable | High-quality reasoning, writing, and agent workflows |
| `qwen3.5:27b` | ~16–19 GB | 24–32 GB | Strong general reasoning, coding, and multimodal work where supported |
| `qwen3.5:35b-a3b` | ~20–23 GB | 32 GB | Strong answers with relatively low active compute |
| `gemma4:31b` | ~19–21 GB | 32 GB | Large dense multimodal/general model where available |
| `qwen3:30b-a3b` | ~18–20 GB | 24–32 GB | Tool use and reasoning with MoE efficiency |

For example, a 35B-A3B model is not a 3B download. `A3B` describes the approximate active parameters per token; storage and startup requirements are governed by the total quantised model plus runtime overhead.

## Very large and specialist models

Models such as Qwen’s 122B-A10B and 397B-A17B families, DeepSeek’s large MoE releases, and other 70B–400B models are generally multi-GPU, high-memory workstation, or hosted-server choices. They can be excellent, but they are poor defaults for a desktop app whose main tasks are retrieval, filing, and chat. If you have the hardware, use the exact Ollama or Hugging Face repository card to check quantisation, context support, license, and whether tool calling is implemented in the serving format.

Specialist alternatives worth considering include:

- `qwen2.5-coder` for code generation and repository work.
- `deepseek-r1` for reasoning-heavy prompts when slower responses are acceptable.
- `phi4-mini` for compact CPU-friendly use.
- `mistral-nemo` for long-document workflows.
- `llama3.2-vision` or a current Qwen/Gemma multimodal tag for image-aware notes, when the backend and model both expose vision.

## HauhauCS and K_P imatrix quants

If you want maximum quality from a local GGUF rather than the smallest download, look at the community quantisations by [HauhauCS](https://huggingface.co/HauhauCS). The `Q*_K_P` files are custom, model-specific imatrix quantisations intended to preserve the weights that matter most for that model. They are often larger than the corresponding standard quantisation, but can provide a useful quality/size trade-off; treat claims such as “one or two quant levels better” as an empirical rule of thumb, not a universal benchmark result.

Examples include:

| Model/repository | Example file or tier | Approx. file size | Use |
| --- | --- | ---: | --- |
| `HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive` | `Q6_K_P` | ~6.25 GB | Small multimodal/vision-capable local model |
| `HauhauCS/Gemma4-26B-A4B-Uncensored-HauhauCS-Balanced` | `Q6_K_P` | roughly 15–17 GB | Larger MoE reasoning and chat |
| `HauhauCS/Qwen3.6-27B-Uncensored-HauhauCS-Balanced` | `Q6_K_P` | ~23.2 GB | High-quality larger local model |
| `HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive` | `Q6_K_P` | ~30.6 GB | High-quality MoE model for 32 GB-class machines |

The exact file size, architecture, chat template, and context support are repository-specific. Check the model card and files before downloading. Search results and Hugging Face’s model parser may not recognise every custom filename or quantisation suffix consistently. Your renamed mirrors under [braydenh563 on Hugging Face](https://huggingface.co/braydenh563) can make selected files easier to discover, while retaining the original HauhauCS repository as the primary attribution and source reference.

Some mirrors are deliberately **text-only**: removing the multimodal projector (`mmproj`) can reduce clutter and storage when you never send images, but it removes vision support and must not be presented as equivalent to the original multimodal package. Keep the GGUF metadata, tokenizer/chat template, license information, and source-model attribution intact when mirroring or renaming files.

These are community builds, not official Qwen, Gemma, or Ollama releases. Before using one in MemoryMap, verify that the runtime accepts its GGUF architecture and chat template. `llama.cpp`, LM Studio, and other GGUF-compatible servers may support custom `K_P` files even when a frontend displays the quantisation as unknown. Ollama may require an explicit import/Modelfile rather than a direct pull, so the Hugging Face or GGUF workflow is often the clearer route for these files.

## Ollama and Hugging Face

Ollama is the easiest route: install it, pull a model, and select it in MemoryMap. Use the exact tag shown in the [Ollama model library](https://ollama.com/library), because family names can have multiple sizes, quantisations, and updated revisions.

Hugging Face is the broader catalogue. Search for the model family plus `GGUF` when you want to run it locally through Ollama, LM Studio, llama.cpp, or Jan. A Hugging Face repository may provide several quantisations:

- `Q4_K_M` is a common quality/size compromise.
- `Q5_K_M` or `Q6_K` usually improves quality at a larger size.
- `Q*_K_P` is a custom imatrix family; verify the producer’s documentation and actual file size.
- `Q8_0` is much larger and is useful when memory is plentiful.
- `F16` is generally for high-memory GPUs or specialised serving.

Do not assume that every Hugging Face checkpoint can be imported directly into Ollama. Check for a compatible GGUF, a supported architecture, tokenizer files, chat template, and any separate multimodal projector. Follow the model’s license and usage terms.

## Tools, thinking, and vision

These capabilities are separate:

- **Tool calling** means the model can emit structured tool requests. It does not guarantee reliable planning; small models may call tools incorrectly or forget results.
- **Thinking** means the model can spend additional tokens on reasoning. It can improve difficult answers but increases latency and token use.
- **Vision** means the model accepts image input. The model, backend, and application must all support the same image format.

For MemoryMap agent mode, choose a model that Settings reports as tool-capable. Good starting points are `qwen3.5:9b`, `llama3.1:8b`, `gemma4:12b`, and the larger Qwen/Gemma models when your hardware permits. Always test the actual pulled tag: capability metadata and chat templates vary between builds.

## Context windows and speed

A large advertised context window does not mean every local setup can use it quickly. Context consumes memory in the KV cache, and long prompts reduce generation speed. MemoryMap retrieves a handful of relevant notes rather than placing the whole notebook into every request, so notebook size does not automatically become prompt size.

If responses are slow, reduce the model tier or context length before assuming the notebook is too large. On CPU-only systems, quantisation and thread settings can matter as much as parameter count. On Apple Silicon, unified memory is shared by the operating system and GPU; on discrete GPUs, leave headroom for VRAM and offloading.

## Embeddings and semantic search

MemoryMap’s default embedding model is `BAAI/bge-small-en-v1.5`. It downloads on first use and is separate from the chat model: changing the chat model does not automatically change embeddings. Settings → Models shows the embedding model actually loaded. If you switch embedding models, MemoryMap re-indexes the notes.

An embedding model is not a chat model. Do not pull a large instruct model expecting it to improve semantic search unless the application explicitly supports that embedding architecture. For a multilingual notebook, choose a multilingual embedding model and expect a re-index after changing it.

## Other backends

**Settings → Models → Model backend** can point MemoryMap at an OpenAI-compatible local server such as LM Studio, llama.cpp server, Jan, or vLLM. Use the usual address (`localhost:1234/v1`) when appropriate, or enter the server’s configured address and connect. The server must already have a compatible model loaded.

Ollama provides model downloads and lets the app request a context window. With other backends, the context window is set by the server; MemoryMap reads it and limits prompts accordingly. Tool calling, streaming, thinking, and vision depend on the selected model and the server’s OpenAI-compatible implementation.

## A sensible starting path

1. Install Ollama and try `ollama pull llama3.2`.
2. If it is too weak, try `qwen3.5:4b` or `gemma4:e4b`.
3. With 16 GB memory, try `qwen3.5:9b`, `llama3.1:8b`, or `gemma4:12b`.
4. With 24–32 GB, try `gemma4:26b-a4b` or `qwen3.5:27b`.
5. For maximum local quality, consider a HauhauCS `Q6_K_P` imatrix GGUF if your runtime supports it and your memory budget allows it.
6. For agent mode, verify **Can use tools** in Settings and test filing, retrieval, and a multi-step tool task.

Model availability and tags change. Before documenting a new family or relying on an exact size, check the current [Ollama library](https://ollama.com/library), the model’s [Hugging Face](https://huggingface.co/models) card, and the relevant [HauhauCS](https://huggingface.co/HauhauCS) or [braydenh563](https://huggingface.co/braydenh563) repository.