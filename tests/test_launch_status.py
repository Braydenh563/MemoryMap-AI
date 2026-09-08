"""`memorymap.core.launch_status`: the launcher status protocol, parsed.

The file it reads is written by a shell script and a batch file, appended a
line at a time, and deleted underneath the reader the moment the loading
window is on screen. So the interesting half of this module is what it
does with input that is not a clean protocol line.
"""

from __future__ import annotations

import pytest

from memorymap.core import launch_status as ls


class TestParseLine:
    def test_a_good_line(self):
        step = ls.parse_line("2|5|Python|Building the environment|active")
        assert step is not None
        assert (step.step, step.total) == (2, 5)
        assert step.title == "Python"
        assert step.detail == "Building the environment"
        assert step.state == "active"
        assert not step.done and not step.failed

    def test_done_and_failed_are_flagged(self):
        assert ls.parse_line("1|4|Update|Up to date|done").done
        assert ls.parse_line("3|4|Dependencies|Could not install|failed").failed

    def test_a_bar_in_the_detail_survives(self):
        """Detail is free text, and the launcher does not escape it: a
        rejected line would blank a step for no good reason."""
        step = ls.parse_line("3|4|Dependencies|pip said a|b|c|active")
        assert step is not None
        assert step.detail == "pip said a|b|c"

    def test_an_empty_detail_is_allowed(self):
        step = ls.parse_line("1|4|Update||active")
        assert step is not None and step.detail == ""

    @pytest.mark.parametrize(
        "line",
        [
            "",
            "not a protocol line at all",
            "Starting...",  # the plain text the old protocol wrote
            "1|4|Update|detail",  # too few fields
            "1|4|Update|detail|running",  # not a known state
            "x|4|Update|detail|active",  # step is not a number
            "1|y|Update|detail|active",  # total is not a number
            "0|4|Update|detail|active",  # steps are one-based
            "5|4|Update|detail|active",  # past the end
            "1|0|Update|detail|active",  # no steps at all
            "1|999|Update|detail|active",  # a nonsense total
            "1|4||detail|active",  # no title
            "1|4|   |detail|active",  # a whitespace title
        ],
    )
    def test_malformed_lines_are_rejected(self, line):
        assert ls.parse_line(line) is None

    def test_a_half_written_line_is_rejected_not_raised_on(self):
        """The launcher appends; a reader can catch a line mid-write."""
        assert ls.parse_line("2|5|Pyth") is None


class TestParseAndSummarise:
    HISTORY = "\n".join(
        [
            "1|5|Update|Checking for updates on GitHub|active",
            "1|5|Update|Up to date|done",
            "2|5|Python|Using the existing environment|done",
            "rubbish that should be skipped",
            "3|5|Dependencies|Installing, this can take a few minutes|active",
        ]
    )

    def test_unparseable_lines_are_skipped_not_fatal(self):
        assert len(ls.parse(self.HISTORY)) == 4

    def test_summarise_keeps_the_last_state_of_each_step(self):
        rows = ls.summarise(ls.parse(self.HISTORY))
        assert [r.step for r in rows] == [1, 2, 3]
        assert rows[0].detail == "Up to date"
        assert rows[0].done
        assert rows[2].state == "active"

    def test_latest_is_the_line_currently_current(self):
        assert ls.latest(ls.parse(self.HISTORY)).step == 3
        assert ls.latest([]) is None

    def test_percent_counts_finished_steps_not_the_active_one(self):
        """A bar that reaches 100% while the longest phase is still running
        is the lie the marquee existed to avoid."""
        assert ls.percent(ls.parse(self.HISTORY)) == 40  # 2 of 5 done
        assert ls.percent([]) == 0

    def test_a_failed_step_does_not_count_as_finished(self):
        steps = ls.parse("1|4|Update|Up to date|done\n2|4|Python|Too old|failed")
        assert ls.percent(steps) == 25


class TestReadFile:
    def test_it_reads_a_real_file(self, tmp_path):
        path = tmp_path / "splash.txt"
        path.write_text("1|4|Update|Up to date|done\n", encoding="utf-8")
        assert len(ls.read_file(str(path))) == 1

    def test_a_missing_path_is_not_an_error(self, tmp_path):
        """The launcher deletes this file the instant the window is up."""
        assert ls.read_file(str(tmp_path / "gone.txt")) == []
        assert ls.read_file(None) == []
        assert ls.read_file("") == []

    def test_a_directory_is_not_an_error(self, tmp_path):
        assert ls.read_file(str(tmp_path)) == []

    def test_undecodable_bytes_do_not_raise(self, tmp_path):
        path = tmp_path / "splash.txt"
        path.write_bytes(b"\xff\xfe|4|Update|x|done\n1|4|Update|Up to date|done\n")
        assert len(ls.read_file(str(path))) >= 1
