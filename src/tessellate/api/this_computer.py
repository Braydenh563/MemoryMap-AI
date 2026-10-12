"""Acts on the computer itself are taken only from the computer itself.

The owner, 2026-10-11, from an iPhone over the LAN: "I pressed open file
location for the support bundle on my phone and it opened up file explorer
on my computer which is cool but worried me a bit. I need maximum trust,
proper safe connection, proper security for the lan and open connection".

A device on the network signs in with the password and reads and writes
the notebook; it never makes this computer open a window, restart or quit
the app, install or run software, read a folder of this computer's files,
point the app at another model server, or replace the whole notebook from
a backup. Those wait for someone at this computer.
"""

from __future__ import annotations

import ipaddress

from fastapi import HTTPException, Request

#: Headers a tunnel or reverse proxy adds: a loopback connection carrying
#: one is asking for somebody somewhere else (routes_auth reads the same).
_FORWARDING = ("forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-real-ip")

#: The owner, 2026-10-11: "Shouldn't the notice be ... action denied on
#: this device??" It names the device, not the computer, because the phone
#: is where it is read; downloads are not refused (an export saves on the
#: device that asked), so the wording does not mention them.
REFUSAL = "Not available on this device. Do it on the computer Tessellate runs on."


def is_another_device(request: Request) -> bool:
    """A connection from anywhere but this machine. A real socket always has
    an IP; a test transport's placeholder name ("testclient") is local."""
    host = (request.client.host if request.client else "") or ""
    if any(name in request.headers for name in _FORWARDING):
        return True
    try:
        address = ipaddress.ip_address(host.split("%", 1)[0])
    except ValueError:
        return False
    mapped = getattr(address, "ipv4_mapped", None)
    return not (address.is_loopback or (mapped is not None and mapped.is_loopback))


def this_computer_only(request: Request) -> None:
    """A route dependency: 403 for any other device."""
    if is_another_device(request):
        raise HTTPException(status_code=403, detail=REFUSAL)
