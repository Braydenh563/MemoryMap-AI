"""The certificate LAN mode serves HTTPS with (the owner, 2026-10-05).

WORLD_CLASS_PLAN 12, "Decisions made", 2: "Yes, self-signed HTTPS". SEC-08 of
the 2026-10-05 audit: LAN mode was plain http, so on shared Wi-Fi a passive
listener read the password at unlock and the seven-day session token after.

- Made on this computer with `cryptography` (already a dependency), never
  fetched: no certificate authority is asked and nothing leaves the machine.
- Made once, at the first LAN start (or when the switch is turned on), and
  reused after that, so a phone that trusted it once is not asked again on
  every launch. It is made again only when asked (Settings, "Regenerate
  certificate"), when an address is not on it (DHCP gave a new one), when it is close to expiring, or when the file cannot be read.
- Kept in the data folder, `lan-tls/`, the folder 0700 and both files 0600:
  the key is the one thing that lets another machine pretend to be this one.
- Its names (the SAN) are this computer's host name, its `.local` name,
  `localhost`, and every address LAN mode lists, so the warning a phone shows
  is "not trusted" and never "the wrong name" as well.
- Its SHA-256 fingerprint is shown in Settings, Other devices: the person
  compares it with what the phone's warning shows before trusting it once.

EC P-256 keeps generation instant and every phone browser speaks it. 825
days is the longest validity Apple's platforms accept for a TLS server
certificate, trusted by hand or not.
"""

from __future__ import annotations

import contextlib
import datetime as dt
import ipaddress
import logging
import os
import socket
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)

FOLDER = "lan-tls"
CERT_FILE = "cert.pem"
KEY_FILE = "key.pem"
VALID_DAYS = 825
#: Made again this close to the end, so a phone is never met by an expired one.
RENEW_BEFORE = dt.timedelta(days=30)


@dataclass(frozen=True)
class CertInfo:
    cert_path: Path
    key_path: Path
    fingerprint: str
    not_after: dt.datetime
    names: tuple[str, ...]

    def public(self) -> dict:
        """What Settings shows: never a path, never the key."""
        return {
            "fingerprint": self.fingerprint,
            "expires": self.not_after.date().isoformat(),
            "names": list(self.names),
        }


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def paths(data_dir: Path) -> tuple[Path, Path]:
    folder = Path(data_dir) / FOLDER
    return folder / CERT_FILE, folder / KEY_FILE


def default_names(addresses: list[str] | None = None) -> list[str]:
    """This computer's names and the addresses another device would type."""
    names: list[str] = ["localhost", "127.0.0.1", "::1"]
    with contextlib.suppress(OSError):
        host = socket.gethostname().strip().lower()
        if host:
            short = host.split(".", 1)[0]
            names += [host, short, f"{short}.local"]
    if addresses is None:
        from memorymap.core import netbind

        addresses = netbind.lan_addresses(include_v6=True)
    names += list(addresses)
    seen: list[str] = []
    for name in names:
        if name and name not in seen:
            seen.append(name)
    return seen


def _fingerprint(cert) -> str:  # noqa: ANN001  # an x509.Certificate
    from cryptography.hazmat.primitives import hashes

    digest = cert.fingerprint(hashes.SHA256()).hex().upper()
    return ":".join(digest[i : i + 2] for i in range(0, len(digest), 2))


def _san_names(cert) -> tuple[str, ...]:  # noqa: ANN001
    from cryptography import x509

    try:
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    except x509.ExtensionNotFound:
        return ()
    found = [str(v) for v in san.get_values_for_type(x509.DNSName)]
    found += [str(v) for v in san.get_values_for_type(x509.IPAddress)]
    return tuple(found)


def _not_after(cert) -> dt.datetime:  # noqa: ANN001
    value = getattr(cert, "not_valid_after_utc", None)
    if value is None:  # cryptography before 42
        value = cert.not_valid_after.replace(tzinfo=dt.timezone.utc)
    return value


def _private(path: Path) -> None:
    with contextlib.suppress(OSError, NotImplementedError):
        os.chmod(path, 0o600)


def _write_private(path: Path, data: bytes) -> None:
    """Written 0600 from the first byte (no window where it is readable)."""
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(data)
    _private(path)


def read(data_dir: Path) -> CertInfo | None:
    """The certificate on disk, or None when there is none or it is unreadable."""
    from cryptography import x509

    cert_path, key_path = paths(data_dir)
    if not cert_path.is_file() or not key_path.is_file():
        return None
    try:
        cert = x509.load_pem_x509_certificate(cert_path.read_bytes())
    except (OSError, ValueError):
        return None
    return CertInfo(cert_path, key_path, _fingerprint(cert), _not_after(cert), _san_names(cert))


def generate(data_dir: Path, names: list[str] | None = None) -> CertInfo:
    """A new key and certificate, replacing any there were."""
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

    names = names if names is not None else default_names()
    cert_path, key_path = paths(data_dir)
    cert_path.parent.mkdir(parents=True, exist_ok=True)
    with contextlib.suppress(OSError, NotImplementedError):
        os.chmod(cert_path.parent, 0o700)

    key = ec.generate_private_key(ec.SECP256R1())
    alt: list[x509.GeneralName] = []
    for name in names:
        try:
            alt.append(x509.IPAddress(ipaddress.ip_address(name)))
        except ValueError:
            alt.append(x509.DNSName(name))
    common = next((n for n in names if n not in ("localhost", "127.0.0.1", "::1")), "localhost")
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, common[:64]),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "MemoryMap AI on this computer"),
    ])
    now = dt.datetime.now(dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(minutes=5))
        .not_valid_after(now + dt.timedelta(days=VALID_DAYS))
        .add_extension(x509.SubjectAlternativeName(alt), critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .sign(key, hashes.SHA256())
    )
    _write_private(
        key_path,
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ),
    )
    _write_private(cert_path, cert.public_bytes(serialization.Encoding.PEM))
    return CertInfo(cert_path, key_path, _fingerprint(cert), _not_after(cert), _san_names(cert))


def _norm(name: str) -> str:
    """One spelling per name, so an IPv6 address compares equal however written."""
    try:
        return str(ipaddress.ip_address(name))
    except ValueError:
        return name.lower()


def missing_names(info: CertInfo, wanted: list[str]) -> list[str]:
    """Names a device could type that the certificate on disk does not carry."""
    have = {_norm(n) for n in info.names}
    return [n for n in wanted if _norm(n) not in have]


def ensure(data_dir: Path, names: list[str] | None = None) -> CertInfo:
    """The certificate to serve: the one on disk while it is good, else a new one.

    Good means unexpired and naming every current address. A DHCP change gives
    the computer a new address; a certificate that does not name it makes the
    phone report "wrong name" (Safari: "connection lost"), so it is made again
    (the phone is asked to trust the new one once).
    """
    wanted = names if names is not None else default_names()
    info = read(data_dir)
    if info is not None and info.not_after - _now() > RENEW_BEFORE:
        absent = missing_names(info, wanted)
        if not absent:
            _private(info.cert_path)
            _private(info.key_path)
            return info
        log.info("LAN certificate made again: it did not name %s", ", ".join(absent))
    return generate(data_dir, wanted)


#: The live HTTPS server's TLS context, so a regenerated certificate takes
#: effect on the next connection without a restart (`reload`).
_live_context = None


def set_live_context(context) -> None:  # noqa: ANN001  # an ssl.SSLContext, or None
    global _live_context
    _live_context = context


def reload(info: CertInfo) -> bool:
    """Hand the running HTTPS server a new certificate; False when none runs."""
    if _live_context is None:
        return False
    _live_context.load_cert_chain(str(info.cert_path), str(info.key_path))
    return True
