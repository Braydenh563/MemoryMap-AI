"""A PDF page read shows up in Settings -> Background tasks while it runs.

Reported: "make sure the ocr and featrures int he workspase actually function
and even if the user leaves the things being read. also let the user be able
to stop the readings., make sure eveyrhting appears in the bg processes in
settings." A read is a model round-trip of several seconds and it appeared in
that panel nowhere at all, so closing the workspace mid-read left no sign
anywhere that the app was still working.
"""

from __future__ import annotations

from memorymap.ai import vision_ocr
from memorymap.api import routes_tasks


def test_a_running_page_read_is_listed_as_a_background_task():
    token = vision_ocr.register_page_read("Reading page 4 of scan.pdf")
    try:
        kinds = {task["kind"]: task for task in routes_tasks.collect()}
        assert "page-read" in kinds, "a running page read must appear in GET /tasks"
        assert kinds["page-read"]["label"] == "Reading page 4 of scan.pdf"
    finally:
        vision_ocr.finish_page_read(token)


def test_a_finished_page_read_leaves_the_list():
    token = vision_ocr.register_page_read("Reading page 1 of scan.pdf")
    vision_ocr.finish_page_read(token)
    assert all(task["kind"] != "page-read" for task in routes_tasks.collect())


def test_finishing_twice_is_not_an_error():
    # `_read_page` drops it in a `finally`, and a `finally` that can throw
    # hides the real error.
    token = vision_ocr.register_page_read("Reading page 2 of scan.pdf")
    vision_ocr.finish_page_read(token)
    vision_ocr.finish_page_read(token)


def test_the_reader_is_named_when_it_is_tesseract():
    token = vision_ocr.register_page_read("Reading page 3", model="Tesseract")
    try:
        task = next(t for t in routes_tasks.collect() if t["kind"] == "page-read")
        assert "Tesseract" in task["detail"]
    finally:
        vision_ocr.finish_page_read(token)
