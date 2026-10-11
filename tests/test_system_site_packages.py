"""The opt-in decision for building .venv with --system-site-packages."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("system_site_packages", ROOT / "scripts" / "system_site_packages.py")
ssp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ssp)

REQ = "sentence-transformers>=6.1.0,<7.0\ntorch>=2.2,<3.0 ; sys_platform == 'win32'\n"


def test_no_system_torch_is_allowed():
    assert ssp.decide(None, REQ)[0] is True


def test_a_torch_inside_the_range_is_allowed_including_a_local_tag():
    assert ssp.decide("2.4.1+cu121", REQ)[0] is True
    assert ssp.decide("2.2.0", REQ)[0] is True


def test_a_torch_outside_the_range_is_refused_with_the_reason():
    for version in ("2.1.9", "3.0.0", "1.13.1"):
        allowed, reason = ssp.decide(version, REQ)
        assert allowed is False and version in reason and ">=2.2,<3.0" in reason


def test_an_unreadable_version_is_refused():
    assert ssp.decide("nightly", REQ)[0] is False


def test_the_range_follows_requirements_txt():
    assert ssp.torch_range("torch>=2.5,<2.7")[0] == (2, 5)
    assert ssp.torch_range(None) == ssp.DEFAULT_RANGE
    assert ssp.decide("2.4.0", "torch>=2.5,<2.7")[0] is False


def test_the_launcher_calls_the_script_and_only_when_opted_in():
    text = (ROOT / "start.sh").read_text(encoding="utf-8")
    assert 'MEMORYMAP_SYSTEM_SITE_PACKAGES:-0}" = "1"' in text
    assert "scripts/system_site_packages.py" in text
    assert "--system-site-packages" in text
