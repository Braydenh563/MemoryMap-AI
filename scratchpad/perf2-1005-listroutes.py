"""Routes that return a list, or a dict holding one, without a `limit` (audit ARCH-13).

    PYTHONPATH=src .venv/bin/python scratchpad/perf2-1005-listroutes.py
"""

import ast
import inspect
import os
import tempfile
import textwrap
import typing

os.environ.setdefault("MEMORYMAP_DATA_DIR", tempfile.mkdtemp(prefix="perf2-1005-routes-"))

from fastapi.routing import APIRoute  # noqa: E402

from memorymap.api.app import create_app  # noqa: E402

LISTY_CALLS = {"list", "sorted", "all", "_to_out_bulk", "scalars"}


def returns_list(route: APIRoute) -> str | None:
    model = route.response_model
    if typing.get_origin(model) is list:
        return "list"
    hint = typing.get_type_hints(route.endpoint).get("return") if hasattr(route.endpoint, "__annotations__") else None
    if typing.get_origin(hint) is list:
        return "list"
    try:
        source = textwrap.dedent(inspect.getsource(route.endpoint))
    except (OSError, TypeError):
        return None
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Return) and isinstance(node.value, ast.Dict):
            for key, value in zip(node.value.keys, node.value.values):
                if isinstance(value, (ast.ListComp, ast.List)) and not (isinstance(value, ast.List) and not value.elts):
                    return f"dict[{ast.unparse(key) if key else '**'}]"
                if isinstance(value, ast.Call):
                    func = value.func
                    name = func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", "")
                    if name in LISTY_CALLS:
                        return f"dict[{ast.unparse(key) if key else '**'}]"
    return None


def all_routes():
    """Every APIRoute on every router in api/ (the app wraps included routers)."""
    import importlib
    import pkgutil

    from fastapi import APIRouter

    import memorymap.api as api

    for info in pkgutil.iter_modules(api.__path__):
        module = importlib.import_module(f"memorymap.api.{info.name}")
        for value in vars(module).values():
            if isinstance(value, APIRouter):
                yield from (r for r in value.routes if isinstance(r, APIRoute))


def main() -> None:
    create_app()
    rows = []
    for route in all_routes():
        if not isinstance(route, APIRoute) or "GET" not in route.methods:
            continue
        shape = returns_list(route)
        if not shape:
            continue
        params = {p.name for p in route.dependant.query_params}
        if "limit" in params:
            continue
        rows.append((route.path, route.endpoint.__name__, shape))
    for row in sorted(rows):
        print(*row, sep="\t")
    print(len(rows), "unpaged list routes")
    os._exit(0)


if __name__ == "__main__":
    main()
