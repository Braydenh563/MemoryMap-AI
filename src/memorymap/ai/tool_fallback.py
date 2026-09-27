"""Which provider answers a tool-calling turn when the chosen one is down.

The seam the needle extra plugs into (INBOX 302; the owner, 2026-09-24:
"Yes, as an extra"). The rule is short on purpose:

1. The backend the user chose, whenever it answers. needle never shadows a
   running Ollama or OpenAI-compatible server: it writes no prose, and a
   model that does is always the better answer.
2. Otherwise needle, if its extra is installed.
3. Otherwise nothing, and the caller carries on exactly as it did before
   this module existed (the "the model is not running" path).

**Nothing is imported to answer "is it installed".** Step 2 looks at the
extra's folder on disk (`extras.download_ready`) and imports
`ai/needle_provider.py` only when the folder is there, so an app without the
extra never loads it, and one with it loads the engine only on the first
turn that needs it.
"""

from __future__ import annotations

import importlib

from memorymap.ai.provider import Provider


def for_tools(primary: Provider) -> Provider | None:
    """`primary` if it is running, else the needle provider if installed,
    else None."""
    if primary.is_running():
        return primary
    from memorymap.core import extras

    if extras.download_ready("needle") is None:
        return None
    module = importlib.import_module("memorymap.ai.needle_provider")
    return module.NeedleProvider()
