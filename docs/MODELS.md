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

### Choosing Q4, Q5, or Q6

`Q6_K_P` is not always the right choice. It can be too large for a laptop, GPU, or unified-memory system even when the model itself is attractive. HauhauCS-style imatrix builds are available at several quality levels, so choose by the memory you actually have:

| Approximate available memory | Prefer | Practical guidance |
| --- | --- | --- |
| 8 GB | Compatibility-renamed `Q4_K_M` mirror | Usually the best chance of fitting a small model while leaving room for the OS and context |
| 12–16 GB | Compatibility-renamed `Q4_K_M` or `Q5_K_M` mirror | Q5 is a strong quality/size compromise if the model fits comfortably |
| 24 GB | `Q5_K_P` or `Q6_K_P` | Use Q6 when the extra quality is worth the larger download |
| 32 GB or more | `Q6_K_P` and larger variants | Better for larger MoE models and longer contexts |

### Compatibility-renamed mirrors

The [braydenh563 Hugging Face mirrors](https://huggingface.co/braydenh563) intentionally rename smaller HauhauCS imatrix files for compatibility:

- Original `Q4_K_P` files are renamed `Q4_K_M`.
- Original `Q5_K_P` files are renamed `Q5_K_M`.
- Original `Q6_K_P` files remain named `Q6_K_P`, because Hugging Face/Ollama workflows accept that label for these files.

This is a filename and frontend compatibility convention, not a claim that the files were produced by the standard upstream `K_M` quantiser. A mirror labelled `Q4_K_M` may contain a HauhauCS `Q4_K_P` file, and a mirror labelled `Q5_K_M` may contain a HauhauCS `Q5_K_P` file. Check the model card, GGUF metadata, file size, and source attribution before comparing quality or compatibility.

## Your braydenh563 model cards

The following recommendations are based on the model-card notes and file tables in the linked repositories, not only on the repository names. These are compatibility-packaged community builds derived from HauhauCS work; they are not official Qwen, Google, Ollama, or Hugging Face releases.

### Qwen3.6 35B-A3B

[Qwen3.6-35B-A3B aggressive Ollama](https://huggingface.co/braydenh563/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Ollama) is a 35B-total/~3B-active MoE model with 262K native context, multimodal text/image/video support, and separate `mmproj` vision weights. Its card lists approximately 23 GB for Q4_K_P, 28 GB for Q5_K_P, 31 GB for Q6_K_P, and 44 GB for Q8_K_P. Your Ollama mirrors use the compatibility names Q4_K_M and Q5_K_M while retaining the underlying HauhauCS K_P files. The card recommends `--jinja`; thinking-mode and non-thinking sampling settings are provided there. Vision requires the matching `mmproj` file. [braydenh563/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggr-Ollama-Text](https://huggingface.co/braydenh563/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggr-Ollama-Text) removes the vision projector and is the text-only option.

This is a strong candidate for coding, tool use, and long-context agent work if the machine can hold a 23–31 GB model plus runtime/context memory. It is not a practical 16 GB-laptop model.

### Qwen3.6 1M + MTP

[Qwen3.6-35B-Uncensored-HauhauCS-1M-MTP-Ollama](https://huggingface.co/braydenh563/Qwen3.6-35B-Uncensored-HauhauCS-1M-MTP-Ollama) is a special one-file package with a 1,048,576-token YaRN-scaled context, a grafted official MTP speculative-decoding layer, and verified vision support via an approximately 899 MB `mmproj`. Its model card lists a 21.7 GB Q4_K_M package and says the Ollama-imported model loads the MTP tensors but does not currently obtain speculative-decoding speedup; llama.cpp with draft-MTP is the appropriate route when MTP acceleration matters. The card also provides `draft_num_predict: 4`, `RENDERER qwen3.5`, and `PARSER qwen3.5` guidance.

Treat “1M context” as a capability ceiling, not a promise that a normal computer can use it comfortably. KV-cache memory is the limiting factor; the card reports roughly 44 GB total for a 1M f16 KV setup and roughly 262K fully resident on a 32 GB card. For MemoryMap, normal retrieval means a smaller context is usually preferable and faster.

### Gemma 4 E4B

[Gemma 4 E4B aggressive Ollama](https://huggingface.co/braydenh563/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Ollama) is an approximately 4B-parameter multimodal model with 131K context and text, image, video, and audio support when the matching approximately 945 MB `mmproj` is supplied. The card lists roughly 5.1 GB Q4_K_P, 5.5 GB Q5_K_P, 5.9 GB Q6_K_P, and 7.6 GB Q8_K_P. The text-only mirror removes the projector and is appropriate when MemoryMap only handles text; it reduces package complexity but removes vision/audio.

This is one of the most practical profile models for an 8–16 GB machine. Use the compatibility-renamed Q4_K_M or Q5_K_M mirror when direct Ollama discovery matters. The card recommends `temperature=1.0`, `top_p=0.95`, and `top_k=64`, with `--jinja` for llama.cpp.

### Gemma 4 E2B

[Gemma 4 E2B aggressive Ollama](https://huggingface.co/braydenh563/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive-Ollama) is the lightweight option: approximately 2B parameters, 131K context, and multimodal text/image/video/audio support with an approximately 940 MB `mmproj`. Its card lists about 3.3 GB Q4_K_P, 3.5 GB Q5_K_P, 3.7 GB Q6_K_P, and 4.7 GB Q8_K_P. The text-only mirror removes the projector.

It is suitable for quick filing, lightweight chat, and edge/CPU experimentation, but the card explicitly cautions that it remains a 2B model. Do not expect the same nuanced reasoning, tool reliability, or long coherent output as E4B or Qwen3.6 35B.

### Gemma 4 26B-A4B Balanced

[Gemma4-26B-A4B Balanced Ollama](https://huggingface.co/braydenh563/Gemma4-26B-A4B-Uncensored-HauhauCS-Balanced-Ollama) is a 25.2B-total/~3.8B-active MoE model with 256K native context and native vision through an approximately 1.2 GB `mmproj`. Its card lists approximately 17 GB Q4_K_P, 19 GB Q5_K_P, 23 GB Q6_K_P, and 27 GB Q8_K_P, plus smaller IQ variants. The text-only mirror is [Gemma4-26B-A4B-Bal-Ollama-Text](https://huggingface.co/braydenh563/Gemma4-26B-A4B-Uncensored-HauhauCS-Bal-Ollama-Text).

The card positions Balanced primarily for creative writing, roleplay, emotional intelligence, and stable long-context sampling, while noting that Qwen3.6 is generally stronger for agentic coding/tool use. It recommends Q4 for most coding workloads when the model fits, and exposes `enable_thinking` controls. Vision works only with `mmproj`, and the card recommends placing images before text.

## Vision models

A vision-language model normally has two components: the language-model GGUF and a matching multimodal projector or vision tower. A text-only mirror can be easier to run but cannot accept images. Do not infer vision support from a model’s name alone; check the card and runtime.

| Model | Practical role | Local notes |
| --- | --- | --- |
| `braydenh563/Qwen3.6-35B-Uncensored-HauhauCS-1M-MTP-Ollama` | Long-context vision, coding-agent backend | 21.7 GB Q4 package plus ~899 MB vision projector; Ollama imports it but does not currently gain MTP speculation |
| `braydenh563/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Ollama` | High-quality multimodal reasoning | 23 GB Q4, 28 GB Q5, 31 GB Q6; requires the matching ~899 MB `mmproj` |
| `braydenh563/Gemma4-26B-A4B-Uncensored-HauhauCS-Balanced-Ollama` | Creative writing plus vision | 17 GB Q4, 19 GB Q5, 23 GB Q6; requires ~1.2 GB `mmproj` |
| `braydenh563/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Ollama` | Practical laptop vision/audio | 5.1 GB Q4, 5.5 GB Q5, 5.9 GB Q6; requires ~945 MB `mmproj` |
| `braydenh563/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive-Ollama` | Lightweight edge vision/audio | 3.3 GB Q4, 3.5 GB Q5, 3.7 GB Q6; requires ~940 MB `mmproj` |
| `LiquidAI/LFM2.5-VL-1.6B-GGUF` | Very small on-device image understanding | Use the official GGUF card and its supported llama.cpp multimodal command; suitable when memory and latency matter most |
| `Qwen3-VL` GGUF releases | General vision, OCR-adjacent image reasoning, and thinking variants | GGUF distributions commonly separate the language model and vision component; verify backend support and the matching projector |

The small LFM2.5-VL family is a useful vision specialist rather than a replacement for a general MemoryMap agent. Qwen3-VL is a stronger general multimodal family, but its GGUF packaging and backend support should be checked per size and variant.

## OCR and document models

OCR models are different from general vision chat models: they are trained or tuned to transcribe text, preserve layout, read tables, and sometimes emit bounding boxes or Markdown. For a notebook application, use OCR as a preprocessing step, then pass the extracted text to the normal MemoryMap embedding/chat pipeline.

| Model | Best for | Runtime and caveats |
| --- | --- | --- |
| `ggml-org/GLM-OCR-GGUF` | Small, multilingual document OCR and table/image transcription | Official GGUF conversion; `llama-server -hf ggml-org/GLM-OCR-GGUF` is the straightforward llama.cpp route |
| `ggml-org/DeepSeek-OCR-GGUF` | High-accuracy OCR from documents and screenshots | GGUF support is available; check the current card and llama.cpp build |
| `sahilchachra/Unlimited-OCR-GGUF` | Long-horizon document parsing and Markdown conversion | Requires DeepSeek-OCR-aware llama.cpp support; every run needs one language GGUF plus the shared fp16 `mmproj` |
| DeepSeek-OCR / DeepSeek-OCR 2 | OCR plus visual document understanding | Some GGUF paths are NexaSDK-specific; Transformers paths require the appropriate model implementation and GPU support |
| `Qwen3-VL` | General image understanding with OCR as one capability | Better when OCR is part of a broader visual reasoning task rather than pure transcription |
| `LFM2.5-VL` | Lightweight image reading and simple OCR | Good edge option, but not a dedicated high-accuracy document parser |

For GLM-OCR and other supported llama.cpp OCR models, the current recommended pattern is an OpenAI-compatible `llama-server`, for example:

```bash
llama-server -hf ggml-org/GLM-OCR-GGUF
```

For Unlimited-OCR, use `--temp 0` for deterministic OCR and supply both the language model and its projector. Keep OCR model serving separate from the chat model unless the application explicitly supports multimodal OCR requests.

## Ollama and Hugging Face

Ollama is the easiest route: install it, pull a model, and select it in MemoryMap. Use the exact tag shown in the [Ollama model library](https://ollama.com/library), because family names can have multiple sizes, quantisations, and updated revisions.

Hugging Face is the broader catalogue. Search for the model family plus `GGUF` when you want to run it locally through Ollama, LM Studio, llama.cpp, or Jan. A Hugging Face repository may provide several quantisations:

- `Q4_K_M` is a common quality/size compromise.
- `Q5_K_M` or `Q6_K` usually improves quality at a larger size.
- `Q*_K_P` is a custom imatrix family; verify the producer’s documentation and actual file size.
- A compatibility-renamed `Q4_K_M` or `Q5_K_M` may contain a custom `Q4_K_P` or `Q5_K_P` file.
- `Q8_0` is much larger and is useful when memory is plentiful.
- `F16` is generally for high-memory GPUs or specialised serving.

Do not assume that every Hugging Face checkpoint can be imported directly into Ollama. Check for a compatible GGUF, a supported architecture, tokenizer files, chat template, and any separate multimodal projector. Follow the model’s license and usage terms.

## Tools, thinking, and vision

These capabilities are separate:

- **Tool calling** means the model can emit structured tool requests. It does not guarantee reliable planning; small models may call tools incorrectly or forget results.
- **Thinking** means the model can spend additional tokens on reasoning. It can improve difficult answers but increases latency and token use.
- **Vision** means the model accepts image input. The model, backend, and application must all support the same image format.

For MemoryMap agent mode, choose a model that Settings reports as tool-capable. Good starting points are `qwen3.5:9b`, `llama3.1:8b`, `gemma4:12b`, and the larger Qwen/Gemma models when your hardware permits. For image-aware notes, use one of the explicitly multimodal variants above. OCR models should generally be used as a separate extraction service. Always test the actual pulled tag: capability metadata and chat templates vary between builds.

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
2. If it is too weak, try `qwen3.5:4b` or the profile’s Gemma 4 E4B Q4/Q5 compatibility mirror.
3. With 16 GB memory, try a text-only E4B or Qwen3.6 build only if the measured file and runtime fit; otherwise use a smaller model.
4. For local vision on modest hardware, try LFM2.5-VL or Gemma 4 E4B with its `mmproj`.
5. For 24–32 GB, consider Gemma4 26B-A4B Q4/Q5 or Qwen3.6 35B-A3B Q4/Q5 compatibility mirrors.
6. For OCR, run GLM-OCR or DeepSeek-OCR through a supported llama.cpp/NexaSDK workflow and feed the extracted text into MemoryMap.
7. Use the Qwen3.6 1M+MTP package only when you specifically need long-context/vision and have enough KV-cache memory; use llama.cpp for MTP acceleration.
8. For agent mode, verify **Can use tools** in Settings and test filing, retrieval, and a multi-step tool task.

Model availability and tags change. Before documenting a new family or relying on an exact size, check the current [Ollama library](https://ollama.com/library), the model’s [Hugging Face](https://huggingface.co/models) card, and the relevant [HauhauCS](https://huggingface.co/HauhauCS) or [braydenh563](https://huggingface.co/braydenh563) repository.