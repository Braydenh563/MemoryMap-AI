"""The backend address is the one setting that can send notes off this machine.

Everything else about MemoryMap is local by construction: the server binds to
localhost, the database is a file, nothing phones home. §6 made the *chat
backend* an address the user types, and the server posts their notes to
whatever it names on every turn. That is a new outbound surface and it needs a
rule — but the opposite rule from the web reader's.

`websearch._assert_external` refuses anything that ISN'T public, because it
follows untrusted links and must never probe this machine. This is the mirror
image: a model backend is *supposed* to be on localhost or the LAN, so private
addresses are the normal case and refusing them would break the product.

What is left to refuse is narrow, and the interesting member is link-local:
169.254.169.254 is the cloud instance-metadata service, the classic
credential-theft target, and nobody has ever served a language model from it.

The other half is honesty rather than enforcement. Someone who deliberately
points this at a hosted API is entitled to. What they are not entitled to is
for it to happen quietly.
"""

from __future__ import annotations

import pytest

from memorymap.core.security import check_backend_url


def allowed(url):
    return check_backend_url(url)[0]


# --- refused ----------------------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://localhost/v1",
        "gopher://localhost:1234/v1",
        "",
        "not a url at all",
    ],
)
def test_only_http_addresses_can_be_a_backend(url):
    """`file://` is the one that matters: some HTTP libraries support it, and
    a backend URL is read back by the app rather than only written to."""
    assert not allowed(url)


@pytest.mark.parametrize(
    "url",
    [
        "http://169.254.169.254/v1",          # AWS/GCP/Azure metadata
        "http://169.254.169.254:80/latest/",
        "http://[fe80::1]/v1",                # IPv6 link-local
        "http://[::ffff:169.254.169.254]/v1", # the same address wearing a hat
    ],
)
def test_the_cloud_metadata_address_is_refused(url):
    assert not allowed(url)


def test_the_overlapping_categories_are_ordered_correctly():
    """Python's address categories overlap in two places, and each overlap
    flips an answer if the checks run in the wrong order. This is the test
    that catches a well-meaning reordering of `_refuses`.

    169.254.0.0/16 is link-local *and* `is_private`, so an allow-private rule
    running first waves through the cloud metadata address. `::1` is loopback
    *and* `is_reserved`, so a refuse-reserved rule running first rejects the
    most ordinary backend there is.
    """
    import ipaddress

    assert ipaddress.ip_address("169.254.169.254").is_private
    assert ipaddress.ip_address("::1").is_reserved
    assert not allowed("http://169.254.169.254/v1")
    assert allowed("http://[::1]:1234/v1")


def test_a_refusal_explains_itself():
    """A blocked setting with no reason reads as a broken app."""
    ok, reason, _ = check_backend_url("http://169.254.169.254/v1")
    assert not ok
    assert "link-local" in reason and "metadata" in reason


@pytest.mark.parametrize("url", ["http://0.0.0.0/v1", "http://224.0.0.1/v1"])
def test_addresses_nothing_can_listen_on_are_refused(url):
    assert not allowed(url)


# --- allowed, because they are the whole point ------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost:11434",
        "http://127.0.0.1:1234/v1",
        "http://[::1]:1234/v1",
        "http://192.168.1.20:8080/v1",   # a server on the home network
        "http://10.0.0.5:8000/v1",
        "http://172.16.3.4:8000/v1",
    ],
)
def test_local_and_lan_backends_are_normal(url):
    """This is the product. A guard that blocked these would be a guard that
    broke the only thing the setting is for."""
    ok, reason, is_local = check_backend_url(url)
    assert ok and is_local
    assert reason == ""


def test_a_name_that_does_not_resolve_yet_is_not_an_error():
    """"Set the address, then start the server" is the normal order, and a
    docker-compose service name resolves only once its container is up."""
    assert allowed("http://not-started-yet.invalid:1234/v1")


# --- allowed, and said out loud ---------------------------------------------


def test_a_backend_on_the_internet_is_allowed_but_flagged():
    """Someone who wants a hosted API is entitled to one. The app's headline
    promise is that notes stay on the machine, so this cannot be quiet."""
    ok, reason, is_local = check_backend_url("https://api.openai.com/v1")
    assert ok
    assert not is_local
    assert "sent to it over the internet" in reason


def test_the_default_backends_are_local():
    """Whatever else changes, the out-of-the-box configuration must not send
    anything anywhere."""
    from memorymap.core import deps

    for url in deps.DEFAULT_BASE_URLS.values():
        ok, _, is_local = check_backend_url(url)
        assert ok and is_local, url


# --- through the endpoint ----------------------------------------------------


def test_the_endpoint_refuses_a_metadata_address(ai_client):
    response = ai_client.post(
        "/models/provider",
        json={"provider": "openai", "base_url": "http://169.254.169.254/v1"},
    )
    assert response.status_code == 400
    assert "link-local" in response.json()["detail"]


def test_a_refused_address_is_not_saved(ai_client, app_state):
    before = app_state.get_preference("llm_base_url")
    ai_client.post(
        "/models/provider",
        json={"provider": "openai", "base_url": "file:///etc/passwd"},
    )
    assert app_state.get_preference("llm_base_url") == before


def test_the_endpoint_reports_locality(ai_client):
    body = ai_client.post(
        "/models/provider",
        json={"provider": "openai", "base_url": "http://127.0.0.1:1234/v1"},
    ).json()
    assert body["is_local"] is True
    assert body["privacy_note"] == ""


def test_an_empty_address_is_judged_by_the_default_it_will_use(ai_client):
    """Blank means "the usual one for that provider". The check has to run
    against the address that will actually be dialled, not against ""."""
    body = ai_client.post("/models/provider", json={"provider": "openai"}).json()
    assert body["is_local"] is True


def test_the_warning_persists_across_reloads(ai_client, app_state):
    """A warning that shows once when you press Connect and vanishes on the
    next reload is a warning about a condition that has not gone away. The
    status poll — which is what redraws the screen — has to carry it too."""
    app_state.set_preference("llm_provider", "openai")
    app_state.set_preference("llm_base_url", "https://api.openai.com/v1")
    from memorymap.core import deps

    deps.reload_llm_client()

    status = ai_client.get("/models/status").json()
    assert status["is_local"] is False
    assert "over the internet" in status["privacy_note"]


def test_a_local_backend_says_nothing_at_all(ai_client, app_state):
    """No warning fatigue: the ordinary case is silent."""
    app_state.set_preference("llm_provider", "ollama")
    app_state.set_preference("llm_base_url", "")
    from memorymap.core import deps

    deps.reload_llm_client()

    status = ai_client.get("/models/status").json()
    assert status["is_local"] is True
    assert status["privacy_note"] == ""
