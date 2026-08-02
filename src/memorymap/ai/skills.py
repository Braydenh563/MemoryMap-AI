"""Skills: a named, repeatable job over the notebook.

Reported directly, and accurately: *"the way skills are used currently, and
what the skills are at the moment, are incorrect and are closer to just
presaved mini prompts. I keep on trying to get the AI to make me some skills
in the chat but it doesn't recognise that it needs to use tools."*

A skill used to be `{name, prompt}`, and clicking one dropped its prompt into
the chat box. There was no notion of what a skill *does*: no declared inputs,
no tools it may use, no steps, nothing to show progress against. `save_skill`
took a name and a string, so "make me a skill that files my inbox notes" could
only ever produce another sentence — the storage had nowhere to put the steps.
That is why fixing the prompt alone would not have helped.

A skill is now four things, all optional except the first two:

- **prompt** — what it should do, in the user's words. A skill with only this
  behaves exactly as it did before, which is why nothing is lost.
- **steps** — ordered instructions. This is what makes a skill replayable and
  what the UI shows progress against (roadmap §18's missing plan).
- **tools** — an explicit allowlist. Both a safety property *and* a prompt:
  naming the three tools a skill needs is what makes a small model reach for
  them, which is the reported failure. It is also roadmap §11a's win — only
  those schemas go on the wire for the run, instead of all 28.
- **inputs** — declared placeholders, so a skill can be "file everything
  tagged `{{tag}}`" rather than a sentence hoping the model guesses the tag.

This module is deliberately free of app imports: it validates against a set of
tool names handed in by the caller rather than importing the registry, because
`tools.py` imports *this*. Cycles in this codebase have been paid for before.
"""

from __future__ import annotations

import re

MAX_SKILLS = 30
MAX_NAME = 40
MAX_PROMPT = 2000
MAX_DESCRIPTION = 200
# When this skill applies, in the user's own words. Separate from the
# description, which says what the skill *is* — this says when to reach for it,
# and it is the field that makes a skill findable by the model rather than only
# by the person who remembered writing it (§33). Short on purpose: it is
# carried in `list_skills` output, which a turn may read before doing anything.
MAX_WHEN = 160
MAX_STEPS = 10
MAX_STEP = 300
MAX_TOOLS = 12
MAX_INPUTS = 5
MAX_INPUT_VALUE = 200

# {{tag}} — doubled braces so a skill can still talk about {json} literally.
PLACEHOLDER = re.compile(r"\{\{\s*([a-zA-Z][a-zA-Z0-9_]{0,23})\s*\}\}")
INPUT_NAME = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,23}$")


class SkillError(ValueError):
    """Something about this skill is wrong, phrased for whoever wrote it."""


def _text(value, limit: int, what: str) -> str:
    text = str(value or "").strip()
    if len(text) > limit:
        raise SkillError(f"{what} is limited to {limit} characters")
    return text


def normalise(raw: dict, known_tools: set[str] | None = None) -> dict:
    """Validate one skill and return it in canonical form.

    Raises `SkillError` with a sentence meant for the person (or the model)
    that wrote the skill. Unknown keys are dropped rather than rejected: a
    skill saved by an older version carries `useTools`, and refusing it would
    make an upgrade lose the user's skills.
    """
    name = _text(raw.get("name"), MAX_NAME, "A skill name")
    prompt = _text(raw.get("prompt"), MAX_PROMPT, "A skill prompt")
    if not name:
        raise SkillError("A skill needs a name")
    if not prompt:
        raise SkillError("A skill needs a prompt saying what it should do")

    steps = [
        _text(step, MAX_STEP, "A skill step")
        for step in (raw.get("steps") or [])
        if str(step or "").strip()
    ]
    if len(steps) > MAX_STEPS:
        raise SkillError(f"A skill can have at most {MAX_STEPS} steps")

    tools: list[str] = []
    for tool in raw.get("tools") or []:
        tool = str(tool or "").strip()
        if not tool or tool in tools:
            continue
        if known_tools is not None and tool not in known_tools:
            raise SkillError(
                f"There is no tool called “{tool}”. Call list_tools, or pick "
                "from the tools shown in Settings → Tools."
            )
        tools.append(tool)
    if len(tools) > MAX_TOOLS:
        raise SkillError(f"A skill can name at most {MAX_TOOLS} tools")

    inputs = []
    for item in raw.get("inputs") or []:
        if isinstance(item, str):
            item = {"name": item}
        input_name = str((item or {}).get("name") or "").strip()
        if not INPUT_NAME.match(input_name):
            raise SkillError(
                f"“{input_name or item}” is not a usable input name — use "
                "letters, digits and underscores, starting with a letter."
            )
        inputs.append(
            {
                "name": input_name,
                "label": _text(item.get("label"), 60, "An input label")
                or f"{input_name}?",
                "required": bool(item.get("required", True)),
                "default": _text(item.get("default"), MAX_INPUT_VALUE, "An input default"),
            }
        )
    if len(inputs) > MAX_INPUTS:
        raise SkillError(f"A skill can declare at most {MAX_INPUTS} inputs")

    skill = {
        "name": name,
        "prompt": prompt,
        "description": _text(raw.get("description"), MAX_DESCRIPTION, "A description"),
        "when_to_use": _text(raw.get("when_to_use"), MAX_WHEN, "A when-to-use note"),
        "steps": steps,
        "tools": tools,
        "inputs": inputs,
    }
    # Every placeholder used has to be declared, or running the skill sends
    # the model a literal {{tag}} and it invents a value. Cheaper to catch on
    # save than to debug in a run.
    declared = {item["name"] for item in inputs}
    used = set()
    for text in [prompt, *steps]:
        used.update(PLACEHOLDER.findall(text))
    missing = sorted(used - declared)
    if missing:
        raise SkillError(
            "This skill uses "
            + ", ".join(f"{{{{{name}}}}}" for name in missing)
            + " but doesn't declare "
            + ("them" if len(missing) > 1 else "it")
            + " as an input."
        )
    # An action skill is one that names tools or steps; kept as `useTools` so
    # skills saved before this rebuild keep the flag the UI already reads.
    if raw.get("useTools") or steps or tools:
        skill["useTools"] = True
    return skill


def is_action(skill: dict) -> bool:
    """Does running this skill mean acting, rather than just answering?"""
    return bool(skill.get("useTools") or skill.get("steps") or skill.get("tools"))


def fill(text: str, values: dict) -> str:
    """Substitute {{input}} placeholders.

    A *declared* input substitutes even when it is empty — an optional input
    left blank should disappear, not print `{{to}}` at the model. An
    undeclared name is left alone so the mistake is visible, though
    `normalise` refuses to store one in the first place.
    """

    def swap(match: re.Match) -> str:
        name = match.group(1)
        return str(values[name]) if name in values else match.group(0)

    return re.sub(r"[ \t]{2,}", " ", PLACEHOLDER.sub(swap, text))


def missing_inputs(skill: dict, values: dict) -> list[str]:
    """Required inputs with nothing to fill them, by name."""
    return [
        item["name"]
        for item in skill.get("inputs") or []
        if item.get("required")
        and not str(values.get(item["name"], "") or "").strip()
        and not str(item.get("default") or "").strip()
    ]


def input_values(skill: dict, given: dict | None) -> dict:
    """The values a run will actually use: what was given, else the defaults."""
    given = given or {}
    values = {}
    for item in skill.get("inputs") or []:
        name = item["name"]
        supplied = str(given.get(name, "") or "").strip()
        values[name] = supplied or str(item.get("default") or "")
    return values


def run_instruction(skill: dict, values: dict | None = None) -> str:
    """What the model is actually asked, when a skill is run.

    The declared tools are named in the text as well as being the only ones on
    the wire. That is not redundancy: a 3B model that is *told* "use
    tag_note" reaches for it, and the reported failure was a model that had
    the tools and did not know it was meant to act.
    """
    values = input_values(skill, values)
    parts = [f"Run my saved skill “{skill['name']}”."]
    if skill.get("description"):
        parts.append(fill(skill["description"], values))
    parts.append(f"What it should do: {fill(skill['prompt'], values)}")
    if skill.get("steps"):
        numbered = "\n".join(
            f"{i}. {fill(step, values)}" for i, step in enumerate(skill["steps"], start=1)
        )
        parts.append(f"Follow these steps in order, and don't skip one:\n{numbered}")
    given = {name: value for name, value in values.items() if value}
    if given:
        parts.append(
            "Values for this run: "
            + ", ".join(f"{name} = “{value}”" for name, value in given.items())
        )
    if skill.get("tools"):
        parts.append(
            "For this run you have only these tools: "
            + ", ".join(skill["tools"])
            + ". They are the tools this skill needs — use them rather than "
            "answering from memory."
        )
    if is_action(skill):
        parts.append(
            "When you have finished, list what you actually changed. If a step "
            "could not be done, say which one and why."
        )
    return "\n\n".join(parts)


def step_instruction(skill: dict, values: dict | None, index: int) -> str:
    """What the model is asked for **one** step of a skill.

    A skill's steps used to be handed over as one numbered list inside one
    request, which is a plan the model is free to ignore — and a 3B model
    given four instructions at once reliably does the first and narrates the
    rest. Each step is its own turn now, so "the model did step 2" is
    something the app knows rather than something it hopes for.
    """
    values = input_values(skill, values)
    steps = skill.get("steps") or []
    total = len(steps)
    parts = [
        f"You are running the skill “{skill['name']}” for me. "
        f"This is step {index + 1} of {total}.",
        f"The whole job: {fill(skill['prompt'], values)}",
    ]
    if index:
        parts.append(
            "Earlier steps are in the conversation above — build on what they "
            "found rather than starting again."
        )
    parts.append(f"Step {index + 1}, and only this step: {fill(steps[index], values)}")
    given = {name: value for name, value in values.items() if value}
    if given:
        parts.append(
            "Values for this run: "
            + ", ".join(f"{name} = “{value}”" for name, value in given.items())
        )
    if skill.get("tools"):
        parts.append(
            "Tools for this step: "
            + ", ".join(skill["tools"])
            + ". Use them rather than answering from memory."
        )
    parts.append(
        "Do this step and then stop — not the later ones. Say what you did in "
        "a sentence or two. If it cannot be done, say so plainly instead of "
        "pretending it worked."
    )
    return "\n\n".join(parts)


# --- what ships with the app --------------------------------------------------
#
# These lived in `app.js` as BUILTIN_SKILLS, which meant the server could not
# resolve a skill the user clicked and every field added here had to be added
# there too. They are served from `GET /skills` now, the same way the web
# search providers are served rather than written out in the frontend.
#
# Every one of them names its tools. That is the point of the rebuild, and it
# is also roadmap §11a: a run offers those schemas instead of all 28, which is
# most of the fixed per-round overhead on a 3B model.
_READING_TOOLS = ["search_notes", "list_notes", "get_note", "count_notes"]

BUILTIN_SKILLS: list[dict] = [
    {
        "name": "📋 Summarise my week",
        "description": "The last seven days, in a paragraph.",
        "prompt": "Summarise what I saved in the last 7 days.",
        "steps": [
            "Find the notes I saved in the last 7 days.",
            "Read the ones that look substantial, rather than working from " + 
            "the previews.",
            "Write the summary: the main topics, anything that looks " + 
            "important, and one thing worth revisiting.",
        ],
        "tools": [*_READING_TOOLS, "summarize_notes"],
    },
    {
        "name": "🧹 Find loose ends",
        "description": "Unfinished things you wrote down and left.",
        "prompt": "Find the loose ends in my notes and list them.",
        "steps": [
            "Search my notes for unfinished work — todo, need to, should, " + 
            "waiting on, must, chase up, follow up.",
            "Read each candidate to check it is genuinely unfinished rather " + 
            "than something I already closed off.",
            "List each loose end with its note id, newest first.",
        ],
        "tools": _READING_TOOLS,
    },
    {
        "name": "🏷 Auto-tag my notes",
        "description": "Adds 2–3 tags to notes that have none.",
        "prompt": "Tag the notes in my notebook that have no tags yet.",
        "steps": [
            "List the tags I already use, so new ones match rather than " + 
            "duplicate them.",
            "Find my notes with no tags, or only one.",
            "Read each of those notes so the tags describe what it actually " + 
            "says.",
            "Call tag_note on each one with 2–3 short, reusable tags.",
            "Tell me which notes you tagged and with what.",
        ],
        "tools": ["list_notes", "get_note", "list_tags", "tag_note"],
    },
    {
        "name": "🔗 Link related notes",
        "description": "Connects notes that are clearly about the same thing.",
        "prompt": "Connect the notes in my notebook that belong together.",
        "steps": [
            "Look through my notes for pairs that are clearly about the same " + 
            "thing but aren't linked yet.",
            "Read both notes of a pair before deciding — a shared word is not " + 
            "a shared subject.",
            "Link each pair you are confident about with link_notes.",
            "Give me a short summary of what you connected, and why.",
        ],
        "tools": ["search_notes", "list_notes", "get_note", "link_notes"],
    },
    {
        "name": "🗂 Tidy suggestions",
        "description": "Proposes tidy-ups. Changes nothing on its own.",
        "prompt": "Suggest how I could tidy my notebook, without changing it.",
        "steps": [
            "List my categories and tags with their counts.",
            "Find the overlaps: tags that mean the same thing, categories " + 
            "with one or two notes, notes that look misfiled.",
            "Give me the suggestions as a numbered list and ask which ones I " + 
            "want applied. Do not change anything yourself.",
        ],
        "tools": ["list_categories", "list_tags", "count_notes", "list_notes"],
    },
    {
        "name": "🔎 Catch up on a topic",
        "description": "Everything you've written about one thing.",
        "prompt": "Pull together everything I have written about {{topic}}.",
        "steps": [
            "Search my notes for {{topic}}.",
            "Read the most relevant ones in full.",
            "Tell me what I seem to think about {{topic}}, what is still " + 
            "unresolved, and what I said about it most recently.",
        ],
        "inputs": [{"name": "topic", "label": "Which topic?", "required": True}],
        "tools": _READING_TOOLS,
    },
    {
        "name": "📓 Daily review",
        "description": "Today's notes, turned into tomorrow's list.",
        "prompt": "Review what I captured today and tell me what needs doing.",
        "steps": [
            "Find the notes I saved today.",
            "Read them, and pick out anything that is actually an action.",
            "Set a reminder for each action that has a time in it, using the " + 
            "current clock to work the time out.",
            "Give me the rest as a short list of what is still open.",
        ],
        "tools": [*_READING_TOOLS, "get_current_time", "set_reminder"],
    },
    {
        "name": "✉️ Draft an email",
        "description": "A clear first draft you can edit.",
        "prompt": "Draft an email to {{to}} about {{about}}.",
        "steps": [
            "Check my notes for anything about {{about}} or {{to}} that the " + 
            "email should take into account.",
            "Write the draft: a clear subject line, a short opening, the " + 
            "point, and a plain closing. Friendly, not formal.",
        ],
        "inputs": [
            {"name": "to", "label": "Who is it to?", "required": True},
            {"name": "about", "label": "What is it about?", "required": True},
        ],
        "tools": ["search_notes", "get_note"],
    },
    {
        "name": "💡 Brainstorm ideas",
        "description": "A varied list, drawing on your notes.",
        "prompt": "Brainstorm ideas about {{topic}} with me.",
        "steps": [
            "Look for anything in my notes about {{topic}}, so the ideas " + 
            "build on what I already think.",
            "Give me a varied list of ideas — some obvious, some not — and " + 
            "say which one you would start with.",
        ],
        "inputs": [{"name": "topic", "label": "What are we brainstorming?"}],
        "tools": ["search_notes", "get_note"],
    },
    {
        "name": "📖 Explain a concept",
        "description": "Plain English, with an example.",
        "prompt": "Explain {{concept}} to me clearly and simply.",
        "steps": [
            "Check whether I already have notes on {{concept}}, and pitch the " + 
            "explanation at what they show I know.",
            "Explain it in plain English with one short example, then offer " + 
            "to save the explanation as a note.",
        ],
        "inputs": [{"name": "concept", "label": "Which concept?"}],
        "tools": ["search_notes", "get_note", "create_note"],
    },
    {
        "name": "🗓 Create a study plan",
        "description": "A realistic plan, with reminders set.",
        "prompt": "Help me plan how to get {{goal}} done by {{deadline}}.",
        "steps": [
            "Check my notes for anything already written about {{goal}}.",
            "Lay out a realistic step-by-step plan between now and " + 
            "{{deadline}}, working the dates out from the current time.",
            "Set a reminder for the first milestone, and ask before setting " + 
            "the rest.",
        ],
        "inputs": [
            {"name": "goal", "label": "What are you working towards?"},
            {"name": "deadline", "label": "By when? (e.g. 3 weeks, 12 May)"},
        ],
        "tools": ["search_notes", "get_note", "get_current_time", "set_reminder"],
    },
]


def builtins(known_tools: set[str] | None = None) -> list[dict]:
    """The shipped skills, normalised and marked as not editable."""
    return [
        {**normalise(skill, known_tools), "builtin": True} for skill in BUILTIN_SKILLS
    ]


def stored(config) -> list[dict]:
    """The user's own skills, exactly as saved."""
    return list(config.get_preference("skills", []) or [])


def catalog(config, known_tools: set[str] | None = None) -> list[dict]:
    """Everything runnable: built-ins first, then the user's own.

    A stored skill that no longer validates (a tool it named has since been
    renamed, say) is carried through as a prompt-only skill rather than
    dropped — losing someone's skill because a field went stale is worse than
    running it with fewer powers than it asked for.
    """
    out = builtins(known_tools)
    for raw in stored(config):
        try:
            skill = normalise(raw, known_tools)
        except SkillError:
            try:
                skill = normalise({"name": raw.get("name"), "prompt": raw.get("prompt")})
            except SkillError:
                continue
        out.append({**skill, "builtin": False})
    return out


def find(config, name: str, known_tools: set[str] | None = None) -> dict | None:
    """One runnable skill by name — built-in or the user's own."""
    wanted = str(name or "").strip()
    for skill in catalog(config, known_tools):
        if skill["name"] == wanted:
            return skill
    return None
