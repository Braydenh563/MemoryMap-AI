"""The package's name before the rename to Tessellate (INBOX 903).

The code lives in `tessellate`. This keeps every older way in working: a
launcher or shortcut from before the rename running `python -m memorymap`,
`uvicorn memorymap.api.app:create_app`, a script or a branch that still says
`from memorymap.core import config`. Each `memorymap.X` import is the same
module object as `tessellate.X`, not a copy, so state (the config, the event
bus, the database engine) is shared whichever name reached it.
"""

from __future__ import annotations

import importlib
import importlib.abc
import importlib.util
import sys

import tessellate as _tessellate

_OLD, _NEW = "memorymap", "tessellate"


class _Alias(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Finds `memorymap.X` by importing `tessellate.X`."""

    def find_spec(self, fullname, path=None, target=None):
        # `memorymap.__main__` is a real file here, so `python -m memorymap` runs it.
        if not fullname.startswith(_OLD + ".") or fullname == _OLD + ".__main__":
            return None
        real = importlib.import_module(_NEW + fullname[len(_OLD):])
        spec = importlib.util.spec_from_loader(fullname, self, is_package=hasattr(real, "__path__"))
        spec.loader_state = (real, real.__spec__)
        return spec

    def create_module(self, spec):
        return spec.loader_state[0]

    def exec_module(self, module):
        # The import system stamped the alias's spec onto the real module;
        # give it its own back so reload() and pickling see `tessellate.X`.
        module.__spec__ = module.__spec__.loader_state[1]


if not any(isinstance(finder, _Alias) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Alias())

__version__ = _tessellate.__version__
SUPPORT_EMAIL = _tessellate.SUPPORT_EMAIL
