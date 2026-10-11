"""LAN mode over HTTPS with a certificate made on this computer (SEC-08).

The owner, 2026-10-05: "Yes, self-signed HTTPS" (WORLD_CLASS_PLAN 12,
"Decisions made", 2). The certificate is made once with `cryptography` (no
network), kept in the data folder at 0600, reused, and names this computer
and its LAN addresses. Settings shows its fingerprint and can make a new one.
The end-to-end test against the real launcher is in `tests/test_lan_mode.py`.
"""

from __future__ import annotations

import datetime as dt
import ipaddress
import os
import stat
import sys

import pytest
from cryptography import x509

from memorymap.core import lancert, netbind

NAMES = ["localhost", "127.0.0.1", "::1", "studio", "studio.local", "192.168.1.9", "2001:db8::5"]


def _cert(info):
    return x509.load_pem_x509_certificate(info.cert_path.read_bytes())


def test_made_once_and_reused(tmp_path):
    first = lancert.ensure(tmp_path, NAMES)
    key_bytes = first.key_path.read_bytes()
    second = lancert.ensure(tmp_path, NAMES)
    assert second.fingerprint == first.fingerprint
    assert second.key_path.read_bytes() == key_bytes


def test_names_this_computer_and_its_lan_addresses(tmp_path):
    info = lancert.ensure(tmp_path, NAMES)
    san = _cert(info).extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    dns = set(san.get_values_for_type(x509.DNSName))
    ips = {str(ip) for ip in san.get_values_for_type(x509.IPAddress)}
    assert {"localhost", "studio", "studio.local"} <= dns
    assert {"127.0.0.1", "::1", "192.168.1.9", "2001:db8::5"} <= ips
    # Addresses go in as IP entries, never as names a browser would not match.
    assert not any(_is_ip(name) for name in dns)


def _is_ip(text):
    try:
        ipaddress.ip_address(text)
    except ValueError:
        return False
    return True


def test_the_default_names_are_the_host_name_and_the_listed_addresses(monkeypatch):
    monkeypatch.setattr(lancert.socket, "gethostname", lambda: "Studio.lan")
    monkeypatch.setattr(netbind, "lan_addresses", lambda include_v6=None: ["10.0.0.7", "fd00::7"])
    names = lancert.default_names()
    for expected in ("studio.lan", "studio", "studio.local", "10.0.0.7", "fd00::7", "localhost"):
        assert expected in names


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX file modes")
def test_the_key_and_certificate_are_private(tmp_path):
    info = lancert.ensure(tmp_path, NAMES)
    for path in (info.cert_path, info.key_path):
        assert stat.S_IMODE(os.stat(path).st_mode) == 0o600, path
    assert stat.S_IMODE(os.stat(info.key_path.parent).st_mode) == 0o700


def test_a_server_certificate_a_phone_accepts(tmp_path):
    cert = _cert(lancert.ensure(tmp_path, NAMES))
    eku = cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value
    assert x509.oid.ExtendedKeyUsageOID.SERVER_AUTH in eku
    assert cert.extensions.get_extension_for_class(x509.BasicConstraints).value.ca is False
    life = cert.not_valid_after_utc - cert.not_valid_before_utc
    assert life <= dt.timedelta(days=826)


def test_regenerate_makes_a_new_one(tmp_path):
    first = lancert.ensure(tmp_path, NAMES)
    second = lancert.generate(tmp_path, NAMES)
    assert second.fingerprint != first.fingerprint
    assert lancert.ensure(tmp_path, NAMES).fingerprint == second.fingerprint


def test_an_unreadable_one_is_replaced(tmp_path):
    info = lancert.ensure(tmp_path, NAMES)
    info.cert_path.write_text("not a certificate")
    assert lancert.ensure(tmp_path, NAMES).fingerprint != info.fingerprint


def test_one_close_to_expiring_is_replaced(tmp_path, monkeypatch):
    info = lancert.ensure(tmp_path, NAMES)
    later = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=lancert.VALID_DAYS - 10)
    monkeypatch.setattr(lancert, "_now", lambda: later)
    assert lancert.ensure(tmp_path, NAMES).fingerprint != info.fingerprint


def test_the_fingerprint_is_sha256_in_pairs(tmp_path):
    info = lancert.ensure(tmp_path, NAMES)
    parts = info.fingerprint.split(":")
    assert len(parts) == 32 and all(len(p) == 2 for p in parts)
    assert info.public().keys() == {"fingerprint", "authority_fingerprint", "expires", "names"}


# --- The authority a phone trusts (INBOX 866) -------------------------------------


def _authority(tmp_path):
    return x509.load_pem_x509_certificate(lancert.authority_pem(tmp_path))


def test_the_server_certificate_is_signed_by_an_authority_a_phone_can_install(tmp_path):
    """iOS lists only authorities under Certificate Trust Settings, Android
    installs only those as a CA certificate, and Firefox refuses an authority
    used as a server certificate: so two certificates, not one."""
    info = lancert.ensure(tmp_path, NAMES)
    ca = _authority(tmp_path)
    basic = ca.extensions.get_extension_for_class(x509.BasicConstraints).value
    assert basic.ca is True and basic.path_length == 0
    assert ca.extensions.get_extension_for_class(x509.KeyUsage).value.key_cert_sign
    leaf = _cert(info)
    assert leaf.issuer == ca.subject != leaf.subject
    leaf.verify_directly_issued_by(ca)
    assert info.authority_fingerprint == lancert._fingerprint(ca) != info.fingerprint
    # The chain the server sends: the server certificate, then the authority.
    chain = x509.load_pem_x509_certificates(info.cert_path.read_bytes())
    assert [c.subject for c in chain] == [leaf.subject, ca.subject]


def test_the_authority_vouches_only_for_this_network(tmp_path):
    """A stolen authority key must not let anyone pose as a bank to a phone
    that trusted it: its name constraints keep it to private addresses,
    `.local` and this computer's own names."""
    lancert.ensure(tmp_path, NAMES)
    ca = _authority(tmp_path)
    ext = ca.extensions.get_extension_for_class(x509.NameConstraints)
    assert ext.critical
    assert lancert._covers(ca, ["192.168.7.20", "10.1.2.3", "studio", "notes.local", "fd00::9"])
    assert not lancert._covers(ca, ["bank.example"])
    assert not lancert._covers(ca, ["8.8.8.8"])
    for path in lancert.authority_paths(tmp_path):
        assert stat.S_IMODE(os.stat(path).st_mode) == 0o600, path


def test_a_new_private_address_keeps_the_authority_the_phone_trusts(tmp_path):
    first = lancert.ensure(tmp_path, ["localhost", "192.168.1.9"])
    second = lancert.ensure(tmp_path, ["localhost", "192.168.1.9", "192.168.1.77"])
    assert second.fingerprint != first.fingerprint
    assert second.authority_fingerprint == first.authority_fingerprint


def test_a_public_address_gets_an_authority_that_covers_it(tmp_path):
    first = lancert.ensure(tmp_path, ["localhost", "192.168.1.9"])
    second = lancert.ensure(tmp_path, ["localhost", "192.168.1.9", "203.0.113.5"])
    assert second.authority_fingerprint != first.authority_fingerprint
    assert lancert._covers(_authority(tmp_path), ["203.0.113.5"])
    assert not lancert._covers(_authority(tmp_path), ["203.0.113.6"])


def test_a_self_signed_certificate_from_before_is_replaced_by_the_pair(tmp_path):
    info = lancert.ensure(tmp_path, NAMES)
    for path in lancert.authority_paths(tmp_path):
        path.unlink()
    again = lancert.ensure(tmp_path, NAMES)
    assert again.fingerprint != info.fingerprint and again.authority_fingerprint


def test_regenerate_makes_a_new_authority_too(tmp_path):
    first = lancert.ensure(tmp_path, NAMES)
    assert lancert.generate(tmp_path, NAMES).authority_fingerprint != first.authority_fingerprint


# --- The routes Settings uses ----------------------------------------------------


PASSWORD = "the owner's password"


@pytest.fixture()
def owner(client):
    token = client.post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    return {"X-Auth-Token": token}


@pytest.fixture(autouse=True)
def _no_live_listener():
    netbind.set_lan_port(None)
    lancert.set_live_context(None)
    yield
    netbind.set_lan_port(None)
    lancert.set_live_context(None)


def test_settings_shows_the_fingerprint_once_lan_mode_is_on(client, app_state, owner):
    body = client.get("/auth/lan-access", headers=owner).json()
    assert body["certificate"] is None
    lancert.ensure(app_state.data_dir, NAMES)
    body = client.get("/auth/lan-access", headers=owner).json()
    assert body["certificate"]["fingerprint"] == lancert.read(app_state.data_dir).fingerprint


def test_turning_it_on_makes_the_certificate(client, app_state, owner):
    reply = client.post(
        "/auth/lan-access", json={"enabled": True, "current_password": PASSWORD}, headers=owner
    )
    assert reply.status_code == 200, reply.text
    assert reply.json()["certificate"]["fingerprint"]
    assert lancert.read(app_state.data_dir) is not None


def test_regenerate_from_settings(client, app_state, owner):
    first = lancert.ensure(app_state.data_dir, NAMES)
    assert client.post("/auth/lan-certificate").status_code == 401
    reply = client.post("/auth/lan-certificate", headers=owner)
    assert reply.status_code == 200, reply.text
    assert reply.json()["certificate"]["fingerprint"] != first.fingerprint


def test_the_addresses_are_https_on_the_lan_port(app_state, monkeypatch):
    monkeypatch.setattr(netbind, "lan_addresses", lambda include_v6=None: ["192.168.1.9"])
    app_state.set_preference(netbind.LAN_PREF, True)
    described = netbind.describe(app_state, 8000)
    assert described["addresses"] == [f"https://192.168.1.9:{netbind.lan_port(8000)}"]
    assert netbind.lan_port(8000) == 8443


def test_regenerate_reaches_the_running_listener(tmp_path):
    """The live TLS context takes the new certificate: no restart needed."""
    import ssl

    first = lancert.ensure(tmp_path, NAMES)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(str(first.cert_path), str(first.key_path))
    lancert.set_live_context(context)
    calls = []
    real = context.load_cert_chain

    class _Spy:
        def load_cert_chain(self, cert, key):
            calls.append(cert)
            return real(cert, key)

    lancert.set_live_context(_Spy())
    assert lancert.reload(lancert.generate(tmp_path, NAMES)) is True
    assert calls == [str(first.cert_path)]


def test_new_address_makes_a_new_certificate(tmp_path, caplog):
    """After a DHCP change the phone must not meet a certificate without the address."""
    first = lancert.ensure(tmp_path, ["localhost", "192.168.1.9"])
    with caplog.at_level("INFO", logger="memorymap.core.lancert"):
        second = lancert.ensure(tmp_path, ["localhost", "192.168.1.9", "192.168.1.77"])
    assert second.fingerprint != first.fingerprint
    assert "192.168.1.77" in second.names
    assert any("made again" in r.message for r in caplog.records)
    # Same list again: reused, no churn.
    assert lancert.ensure(tmp_path, ["localhost", "192.168.1.77"]).fingerprint == second.fingerprint


def test_certificate_download_is_the_authority_only(client, app_state):
    info = lancert.ensure(app_state.data_dir, NAMES)
    r = client.get("/auth/lan-certificate.pem")
    assert r.status_code == 200
    assert b"PRIVATE KEY" not in r.content and r.content.count(b"BEGIN CERTIFICATE") == 1
    assert lancert._fingerprint(x509.load_pem_x509_certificate(r.content)) == info.authority_fingerprint
    assert "attachment" in r.headers["content-disposition"]


def test_certificate_download_works_by_plain_navigation(client, app_state, owner):
    """The phone installs it by opening the link (iOS installs a profile only
    from a navigation, never from a script's download), and a navigation
    carries no X-Auth-Token: so no unlock is asked. The authority's
    certificate is public; every TLS handshake already sends it."""
    lancert.ensure(app_state.data_dir, NAMES)
    assert client.get("/entries").status_code == 401  # locked: the header is what unlocks
    r = client.get("/auth/lan-certificate.pem")
    assert r.status_code == 200 and b"BEGIN CERTIFICATE" in r.content
