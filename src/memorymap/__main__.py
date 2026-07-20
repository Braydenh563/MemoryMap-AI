"""Start the app.

  python -m memorymap             → server at http://localhost:8000
  python -m memorymap --desktop   → the same app in its own window
                                    (needs the optional pywebview:
                                     pip install pywebview)
"""

import argparse
import threading
import time

import uvicorn

from memorymap.api.app import create_app

HOST, PORT = "127.0.0.1", 8000  # local only — this is a private app


def _run_server() -> None:
    uvicorn.run(create_app(), host=HOST, port=PORT, log_level="info")


def _run_desktop() -> None:
    """A real app window (Wave H): uvicorn in a background thread,
    pywebview in front. Closing the window exits the process."""
    try:
        import webview  # the optional pywebview package
    except ImportError:
        print(
            "The desktop window needs the optional pywebview package:\n"
            "  pip install pywebview\n"
            "Starting the normal server instead — open http://localhost:8000"
        )
        _run_server()
        return

    server = threading.Thread(target=_run_server, daemon=True)
    server.start()
    time.sleep(1.0)  # give uvicorn a moment to bind before the window loads
    webview.create_window(
        "MemoryMap AI",
        f"http://{HOST}:{PORT}",
        width=1200,
        height=800,
        min_size=(420, 500),
    )
    webview.start()  # blocks until the window closes; daemon thread dies with us


def main() -> None:
    parser = argparse.ArgumentParser(prog="memorymap", description="MemoryMap AI")
    parser.add_argument(
        "--desktop",
        action="store_true",
        help="open MemoryMap in its own app window (needs pywebview)",
    )
    args = parser.parse_args()
    if args.desktop:
        _run_desktop()
    else:
        _run_server()


if __name__ == "__main__":
    main()
