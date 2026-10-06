<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# I am making an app an I need claude opus to deep brainstorm a way to massively improve all existing features so that they aoutshine competiotr apps, and for new features that other competitors and notone els has or has seen before

Great goal. Here's a copy‑paste prompt you can give to Claude Opus (ideally Opus 4.6/4.7/4.8 or Opus 5 with "Extra high/Max effort" and Extended Thinking on) to drive a deep, competitive‑crushing brainstorm across all your features and uncover truly novel ones.[^1_1][^1_2][^1_3]

## Copy‑paste master prompt for Claude Opus

```text
You are my Chief Product Strategist and Competitive Intelligence Lead. Your job is to help me massively improve every existing feature of my app so it outshines competitors, and to invent new features competitors haven't seen or shipped.

Context about my app
- One‑line: [insert your app's one‑liner]
- Target users: [who uses it, key segments]
- Platform/tech: [web/iOS/Android/desktop; key tech stack]
- Current features (list each with 1–2 lines on what it does and why users care):
  1) [Feature A]: [...]
  2) [Feature B]: [...]
  3) [Feature C]: [...]
  ...
- Top competitors (URLs if possible): [Competitor X], [Competitor Y], [Competitor Z]
- What we want to be known for (3–5 brand attributes): [e.g., fastest, most private, most creative, best onboarding, etc.]
- Constraints to respect: [e.g., must run locally/offline, must be simple, must avoid heavy cloud costs, etc.]
- Time horizon: [e.g., 6–8 weeks for v1 improvements, 3–6 months for moonshots]

Your tasks
1) Competitive teardown (fast but sharp)
   - For each competitor, list their standout features, UX patterns, pricing hooks, and growth loops.
   - Identify 3–5 "table stakes" features we must match or exceed.
   - Identify 3–5 "wedge" opportunities where we can be 10x better or do something they can't copy quickly.

2) Existing feature upgrades (make each one category‑leading)
   For EVERY existing feature I listed:
   - Current state: 1–2 lines on what it does today and where it falls short.
   - 10x vision: describe a version that would be obviously best‑in‑class (speed, delight, outcomes, retention).
   - 5 concrete upgrade ideas (mix of UX, automation, AI, and system design). For each idea include:
     • What changes (specific UI/flow/behavior)
     • Why it wins vs competitors (the differentiator)
     • Effort (S/M/L) and risk (Low/Med/High)
     • Metric it moves (activation, retention, conversion, NPS, time saved, etc.)
   - Quick wins (≤1 week) we can ship immediately.
   - One "signature interaction" per feature that would make people say "only this app does it like this."

3) New feature inventions (novel, defensible, valuable)
   Generate 12–20 new feature ideas that competitors don't have or haven't done well. Organize them into:
   - Category A: Obvious gaps competitors missed (high value, medium effort)
   - Category B: AI‑native superpowers (agentic workflows, automation, personalization, multimodal)
   - Category C: Moonshots (12–24 month defensibility, network effects, data advantages)
   For each idea include:
   • One‑sentence pitch
   • User problem it solves (with a short scenario)
   • Why it's novel vs competitors (what they'd have to rebuild to copy)
   • Core loop/retention hook (why users come back)
   • Effort (S/M/L) and risk (Low/Med/High)
   • First experiment to validate in ≤2 weeks (what to build/measure)

4) Prioritization and roadmap
   - Score all ideas (upgrades + new) using RICE or a simple Impact × Confidence / Effort score.
   - Produce a 90‑day roadmap with 3 phases (Now, Next, Later), listing 5–8 items per phase with expected outcomes.
   - Call out 3 "killer combos" (feature bundles that together create a unique value prop).

5) Risk, moat, and metrics
   - For the top 5 ideas, list the biggest risks and how to de‑risk (technical, UX, distribution, legal/privacy).
   - Suggest 2–3 moat strategies (data network effects, workflow lock‑in, ecosystem/integrations, brand).
   - Define success metrics per phase (activation rate, weekly active users, retention D7/D30, conversion, time‑to‑value).

Output format
- Use clear headings and bullet lists.
- Keep explanations crisp and actionable (no fluff).
- Where helpful, include tiny example UI copy or flow steps.
- End with a "Start tomorrow" checklist: the 5 highest‑leverage actions I should begin in the next 48 hours.

Thinking style
- Be specific, opinionated, and practical.
- Prefer ideas that are fast to validate and hard to copy.
- If something depends on assumptions, state them and propose a quick test.
```


## How to run this with Opus for best results

- Model/settings: Choose Opus (4.6/4.7/4.8 or Opus 5) and set Effort to Extra high/Max; enable Extended Thinking if available.[^1_3][^1_1]
- Paste the prompt above, then fill in the bracketed sections with your app's details before sending.
- If you have competitor URLs, include them; Opus can use them to ground the teardown.[^1_4][^1_5]
- After the first output, iterate with follow‑ups like:
    - "For Feature [X], go 2 levels deeper on the 10x vision and give me 3 alternate UI flows."
    - "Turn the top 6 new feature ideas into 2‑week experiment plans with success metrics."
    - "Rewrite the 90‑day roadmap assuming a 2‑person team and a hard launch date in 10 weeks."


## Optional follow‑up prompts you can reuse

- Deep dive on one feature:

```text
Take feature "[Feature name]" and produce:
- A step‑by‑step user journey map (current vs 10x).
- 3 signature interactions that would make this feature unmistakably ours.
- A 1‑week prototype plan (what screens, what data, what fake‑it‑till‑you‑make‑it bits).
```

- Novelty stress test:

```text
For the top 8 new feature ideas, act as a skeptical competitor PM. For each idea:
- Explain how you would copy it in 4–6 weeks.
- Identify what would actually be hard to copy (data, workflow, integrations, brand).
- Recommend how to strengthen the moat (specific product or distribution moves).
```

- Roadmap compression:

```text
Compress the 90‑day roadmap into a 6‑week sprint plan for a 2‑person team.
- List weekly goals, owner (me / you / external), and the minimum lovable scope per week.
- Call out any feature to cut or defer and why.
```


If you share your app's one‑liner, current features, and 2–3 competitor names/URLs, I can tailor this prompt precisely to your product and pre‑fill the context section for you.[^1_5][^1_6]

<span style="display:none">[^1_10][^1_11][^1_12][^1_13][^1_14][^1_15][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings

[^1_2]: https://www.linkedin.com/posts/lakshaynagpalofficial_digiperformrajourigarden-digiperform-45daylinkedinchallenge-activity-7492494971963617280-tLsm

[^1_3]: https://www.linkedin.com/posts/charlie-obrien01_claude-opus-5-activity-7491441792224022528-wnKx

[^1_4]: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude

[^1_5]: https://www.layer3labs.io/guides/claude-opus-5-explained

[^1_6]: https://academy.techpresso.co/prompts/claude-prompts-sales

[^1_7]: https://www.anthropic.com/claude-fable-and-mythos-5-1

[^1_8]: https://thedigitalprojectmanager.com/tools/best-ai-brainstorming-tools/

[^1_9]: https://github.com/wanshuiyin/auto-claude-code-research-in-sleep

[^1_10]: https://www.cosmicjs.com/blog/claude-opus-46-vs-opus-45-a-real-world-comparison

[^1_11]: https://www.facebook.com/groups/claudecommunity/posts/1083519620855369/

[^1_12]: https://news.ycombinator.com/item?id=49296740

[^1_13]: https://www.reddit.com/r/ClaudeAI/comments/1vnsmio/is_opus_48_better_than_opus_50/

[^1_14]: https://www.facebook.com/nathanhodgson04/videos/comment-breakdown-to-get-the-full-claude-guide-most-people-open-claude-type-into/1404670804957047/

[^1_15]: https://www.facebook.com/mallika.sharma.35/posts/created-a-figma-comment-dashboard-using-claude-by-anthropic-hosted-on-github-bui/27898113059855555/


---

# I need to maximise claude fable's abilities in claude code to do a full deep analysis and critical overview and deep analysis of my application, it has a lot of poor ui, a lot of poor ux, the backend needs refining, there are a lot of capabilities missing (large to even the tiny things that we take for granted). the app doesnt feel professional, it is laggy, poorly designed, lacks reliability and is slow. it is heavy on local ai models, and doesnt fit what a modern application should be. there is a lot of ui consistency and ui ux principles have been semi used but not really. it doesnt feel reliable or nice to use, the mobile ui is completely not designed and is just made to fit all the elements on the page, same with other resolutions. even when features both big and small are present, they are not nearly what they should be and the way they show themselves is not how the user would expect them to. the ui and ux is very flawed and there is a lot of clashing and lack fo spacing. there's so much more but i dont even know what to ask it to check. I need it's full detailed and not truncated plan on what to do and how to do it in a very structured way so I can get claude sonnet and opus to do them and a clear plan to follow. what do I ask it??

Perfect — you want a single, maximally‑effective prompt that turns Claude Fable (in Claude Code) into a ruthless, end‑to‑end app auditor and modernization planner, producing a structured, non‑truncated blueprint Sonnet/Opus can execute.[^2_1][^2_2][^2_3]

Below is a copy‑paste master prompt you can run in Claude Code (Plan Mode, high effort). It forces a full discovery → diagnosis → strategy → roadmap output, with explicit sections for UI/UX, frontend architecture, backend, local AI integration, performance, reliability, mobile/responsive, and “table‑stakes” features you’re missing.[^2_4][^2_5][^2_6]

______________________________________________________________________

## Master prompt for Claude Fable in Claude Code

```text
You are my Lead Product Engineer, UX Director, and Staff Architect rolled into one. Your job is to perform a full, deep, critical analysis of this application and produce a complete, structured, non‑truncated modernization plan that I can hand to Claude Sonnet and Opus to execute.

Assumptions and constraints
- This app currently feels unprofessional, laggy, poorly designed, unreliable, and slow.
- UI/UX is inconsistent, clashing, and lacks proper spacing; mobile and other resolutions are not properly designed.
- Features (big and small) exist but are not implemented to the standard users expect; flows are unintuitive.
- The backend needs refinement; architecture is messy; local AI models are overused or poorly integrated.
- Many basic “table‑stakes” capabilities of a modern app are missing.
- I want a modern, professional, reliable, fast, and delightful application that still leverages local AI where it makes sense.

Your mission
1) Discover and map the current system
   - Explore the codebase to understand:
     • Tech stack (frontend, backend, databases, APIs, local AI models, packaging).
     • Folder structure, key modules, and how data flows from UI → backend → AI → storage.
     • How the app is built, run, tested, and deployed (scripts, configs, CI/CD if any).
   - Summarize the current architecture in plain language:
     • Frontend architecture (frameworks, state management, routing, styling system).
     • Backend architecture (services, APIs, DBs, queues, auth, file handling).
     • Local AI integration (which models, how they’re invoked, latency, fallbacks).
     • Deployment targets (web, desktop, mobile, local, cloud).
   - List the main user roles and core user journeys (e.g., onboarding, primary task, sharing/export, settings).

2) Brutal but constructive audit (no sugar‑coating)
   For each of the following areas, produce a detailed findings section with concrete examples from the codebase and/or UI:
   
   A. UI design and visual consistency
      - Typography, color, spacing, layout grids, component consistency.
      - Where UI principles are half‑applied or violated.
      - Specific screens/components that feel broken, cluttered, or amateur.
   
   B. UX and interaction design
      - Navigation structure, information architecture, discoverability of features.
      - Flows that are confusing, too many steps, or don’t match user mental models.
      - Missing feedback states (loading, error, empty, success), poor error messages.
      - Accessibility gaps (contrast, focus states, keyboard nav, screen reader issues).
   
   C. Frontend architecture and code quality
      - Component structure, duplication, coupling, state management anti‑patterns.
      - Performance issues (re‑renders, large bundles, unoptimized assets, blocking AI calls).
      - Lack of testing, error boundaries, logging, or observability.
   
   D. Backend architecture and reliability
      - API design, error handling, validation, auth, rate limiting, retries.
      - Data model issues, N+1 queries, missing indexes, inconsistent schemas.
      - Reliability concerns (no health checks, poor logging, no monitoring, flaky jobs).
   
   E. Local AI integration
      - Where local AI is overused, underused, or misused.
      - Latency, context size, model selection, fallback strategies, offline behavior.
      - UX around AI (progressive results, streaming, cancel/retry, explainability).
   
   F. Performance and perceived speed
      - Startup time, interaction latency, AI wait times, heavy operations on main thread.
      - Bundle sizes, image/assets optimization, caching strategies.
   
   G. Mobile and responsive design
      - Breakpoints, layout behavior on small screens, touch targets, scrolling patterns.
      - Features that break or become unusable on mobile.
   
   H. Missing “table‑stakes” features
      - Basic capabilities modern users expect (e.g., robust search, filters, sorting, pagination, undo, confirmations, settings, profiles, notifications, export/import, error recovery, onboarding, help docs).
      - Security and privacy basics (auth, sessions, data protection, backups).
   
   For each finding, include:
   - Evidence: file paths, component names, or specific screens.
   - Impact: how this hurts usability, reliability, performance, or trust.
   - Severity: Critical / High / Medium / Low.

3) Strategic vision: what “good” looks like
   - Define a clear vision for the modernized app in 3–5 sentences (how it should feel, perform, and be perceived).
   - List 5–8 design and engineering principles to guide all future work (e.g., “mobile‑first”, “fast by default”, “AI as a power‑user tool, not a crutch”, “consistent design system”, “observable and testable”).
   - Describe the target architecture at a high level:
     • Frontend: framework, component model, state management, styling system, design tokens.
     • Backend: service boundaries, API style (REST/GraphQL), data stores, caching, queues.
     • Local AI: where it stays local, what moves to cloud (if any), model orchestration pattern.
     • Observability: logging, metrics, error tracking, performance monitoring.

4) Concrete improvement plan (structured and executable)
   Organize the work into clear workstreams. For each workstream, provide:
   - Goals and success metrics (e.g., “reduce median interaction latency to <150ms”, “achieve Lighthouse performance ≥90 on mobile”, “cut crash rate by 80%”).
   - A prioritized list of initiatives (each with a short title).
   - For each initiative:
     • Problem it solves (1–2 lines).
     • High‑level solution approach (architecture + UX).
     • Key files/areas to change (as specific as possible from your codebase scan).
     • Dependencies (what must come first).
     • Effort estimate (S/M/L) and risk (Low/Med/High).
     • Suggested owner type (frontend, backend, full‑stack, design).
   
   Workstreams to cover:
   A. Design system and UI consistency
      - Color, type, spacing tokens; component library; layout patterns.
      - Refactor plan for existing screens to adopt the system.
   
   B. UX overhauls for core journeys
      - Onboarding, primary task flow, settings, error/recovery flows.
      - New wireframe‑level descriptions of improved flows.
   
   C. Frontend refactor and performance
      - Component restructuring, state management cleanup, bundle optimization.
      - Specific performance fixes (memoization, virtualization, code splitting, caching).
   
   D. Backend hardening and API cleanup
      - API redesign where needed, validation layers, error handling, retries.
      - Data model migrations, indexing, query optimization.
   
   E. Local AI redesign
      - Which models to keep local, which to replace or augment.
      - New patterns for AI calls (streaming, progressive UI, background tasks, fallbacks).
   
   F. Mobile and responsive redesign
      - Breakpoint strategy, layout changes, touch targets, navigation patterns.
      - Features to simplify or re‑architect for mobile.
   
   G. Table‑stakes feature backlog
      - List of missing basic features, each with a 1–2 line spec and priority.
   
   H. Reliability, testing, and observability
      - Test strategy (unit, integration, E2E), error tracking, logging, dashboards.
      - CI/CD improvements, deployment safety (rollbacks, feature flags).

5) Phased roadmap (Now / Next / Later)
   - Create a 90‑day roadmap split into 3 phases (Now: 0–4 weeks, Next: 5–8 weeks, Later: 9–12+ weeks).
   - For each phase, list 6–10 concrete initiatives from the workstreams above.
   - Ensure each phase delivers visible user value and reduces pain early (e.g., performance + core UX first).
   - Call out 3 “killer combos” (bundles of changes that together make the app feel transformed).

6) Execution playbooks for Sonnet and Opus
   For the top 5–8 highest‑impact initiatives:
   - Write a short “execution brief” that I can paste to Sonnet/Opus to implement each one. Each brief should include:
     • Context and goal (1–2 lines).
     • Files/modules involved.
     • Step‑by‑step plan (numbered).
     • Acceptance criteria (clear, testable).
     • Risks and how to mitigate.
   - Make these briefs specific enough that another agent can start coding immediately.

7) Risk, moat, and metrics
   - Identify the top risks in this modernization (technical, UX, timeline, user disruption) and how to de‑risk them.
   - Suggest 2–3 moat strategies (e.g., unique AI workflows, data advantages, ecosystem/integrations).
   - Define a small set of north‑star metrics and phase‑level KPIs (performance, reliability, engagement, satisfaction).

Output format and style
- Use clear Markdown headings and bullet lists.
- Be specific, opinionated, and practical; avoid vague advice.
- Reference actual files, components, and paths from this codebase wherever possible.
- Do NOT truncate the plan. If you approach length limits, continue in subsequent messages until the full plan is delivered.
- End with a “Start tomorrow” checklist: the 5–7 highest‑leverage actions I should begin in the next 48 hours.

Before you begin
- If anything critical is unclear (e.g., target platforms, key user journeys, non‑negotiable constraints), ask up to 5 focused questions first. If you can infer reasonable answers from the codebase, proceed and state your assumptions explicitly.
```


______________________________________________________________________

## How to run this in Claude Code for best results

- Use **Plan Mode** (or `--permission-mode plan`) so Fable reads and plans before touching code.[^2_2][^2_3]
- Set **effort** to high/extra high so it doesn’t shortcut the analysis.[^2_1]
- Paste the prompt into your repo root in Claude Code, then:
    - Let it explore the codebase and ask clarifying questions if needed.
    - Review its architecture summary and assumptions before it dives into the full audit.
    - If it starts truncating, tell it: “Continue the plan from where you left off; do not summarize, keep full detail.”

______________________________________________________________________

## Follow‑up prompts you’ll likely want

Once the big plan is done, use targeted prompts like:

- “Take workstream A (Design system) and expand it into a step‑by‑step implementation plan with file‑by‑file changes and example tokens/components.”
- “For the top 3 performance issues, write concrete refactor plans with before/after code patterns and benchmarks to hit.”
- “Turn the mobile redesign section into a set of tickets: each ticket = one screen or component, with acceptance criteria and UX notes.”

If you tell me your app’s stack (e.g., React/Next/Vue, Node/Python backend, how local AI is wired in), I can tailor this prompt’s assumptions and examples to your exact setup.

<span style="display:none">[^2_10][^2_11][^2_12][^2_13][^2_14][^2_15][^2_7][^2_8][^2_9]</span>

<div align="center">⁂</div>

[^2_1]: https://www.firecrawl.dev/blog/best-claude-code-skills

[^2_2]: https://sidbharath.com/blog/claude-code-the-complete-guide/

[^2_3]: https://www.linkedin.com/posts/christiandobbert_stop-asking-claude-to-code-before-youve-activity-7493268822653648896-gyD\_

[^2_4]: https://claudedirectory.org/for/refactoring

[^2_5]: https://www.jappware.com/insights/what-is-legacy-system-modernization-in-fintech-strategies-and-benefits/

[^2_6]: https://academy.techpresso.co/prompts/claude-code-prompts

[^2_7]: https://github.com/Piebald-AI/claude-code-system-prompts

[^2_8]: https://ixdf.org/literature/topics/page-structure

[^2_9]: https://www.classicinformatics.com/blog/top-10-mobile-app-development-companies-in-usa-2026

[^2_10]: https://www.linkedin.com/posts/vitalyfriedman_ux-design-activity-7495058067961872384-6l1d

[^2_11]: https://www.skmgp.com/blog/what-are-mobile-applications-meaning---technical-definition-architecture-and-use-cases

[^2_12]: https://www.digisoftsolution.com/mobile-first-design-services

[^2_13]: https://www.thinkitive.com/blog/ehr-development-requirements-checklist/

[^2_14]: https://www.reddit.com/r/ClaudeAI/comments/1vxtnrd/claude_code_writes_working_code_but_the/

[^2_15]: https://www.techaheadcorp.com/blog/top-fitness-app-development-companies-usa/

