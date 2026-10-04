"""What a person searches for never reaches the access log or the log viewer.

`GET /search?q=my diagnosis` used to be written whole into uvicorn's access
line, the Settings log viewer and the support bundle.
"""

import logging

from memorymap.core import logbuffer


def _access(path: str) -> logging.LogRecord:
    # The shape uvicorn.access emits: the path arrives in args, not in msg.
    return logging.LogRecord(
        "uvicorn.access", logging.INFO, __file__, 1,
        '%s - "%s %s HTTP/%s" %d', ("127.0.0.1:1", "GET", path, "1.1", 200), None,
    )


def test_search_text_is_redacted_but_paging_is_kept():
    record = _access("/search?q=my%20diagnosis&kind=note,board&limit=50")
    assert logbuffer.QueryScrubFilter().filter(record) is True
    line = record.getMessage()
    assert "diagnosis" not in line
    assert "/search?q=[redacted]&kind=note,board&limit=50" in line


def test_every_unlisted_key_is_redacted_not_only_q():
    for key in ("q", "query", "search", "text", "title", "tag", "name", "needle"):
        line = _access(f"/x?{key}=secretword").getMessage()
        record = _access(f"/x?{key}=secretword")
        logbuffer.QueryScrubFilter().filter(record)
        assert "secretword" not in record.getMessage(), key
        assert line  # the unfiltered line really did carry it


def test_an_encoded_or_upper_case_safe_key_is_still_safe_and_an_odd_one_is_not():
    record = _access("/entries?LIMIT=5&%71=hidden&semantic=true")
    logbuffer.QueryScrubFilter().filter(record)
    line = record.getMessage()
    assert "LIMIT=5" in line and "semantic=true" in line
    assert "hidden" not in line  # %71 is "q"


def test_a_preformatted_message_and_a_path_without_a_query_are_handled():
    plain = logging.LogRecord(
        "httpx", logging.INFO, __file__, 1,
        'HTTP Request: GET http://127.0.0.1:8888/search?q=private+thing&format=json "HTTP/1.1 200 OK"',
        (), None,
    )
    logbuffer.QueryScrubFilter().filter(plain)
    assert "private" not in plain.getMessage()
    assert "format=json" in plain.getMessage()
    bare = _access("/entries/5")
    logbuffer.QueryScrubFilter().filter(bare)
    assert "/entries/5 HTTP" in bare.getMessage()


def test_the_log_viewer_buffer_never_holds_the_query():
    logbuffer.clear()
    logbuffer.install()
    logging.getLogger("uvicorn.access").info(
        '%s - "%s %s HTTP/%s" %d', "127.0.0.1:1", "GET", "/search?q=oncologist+notes", "1.1", 200
    )
    logging.getLogger("httpx").info("HTTP Request: GET http://x/search?q=oncologist")
    held = " ".join(r["message"] for r in logbuffer.recent(50))
    assert "oncologist" not in held
    assert "/search?q=[redacted]" in held


def test_install_attaches_the_query_scrubber_once():
    logbuffer.install()
    logbuffer.install()
    access = logging.getLogger("uvicorn.access")
    assert sum(isinstance(f, logbuffer.QueryScrubFilter) for f in access.filters) == 1
