"""Start the app: `python -m memorymap`, then open http://localhost:8000/docs."""

import uvicorn

from memorymap.api.app import create_app


def main() -> None:
    # 127.0.0.1 only — this is a local-first, private app.
    uvicorn.run(create_app(), host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
