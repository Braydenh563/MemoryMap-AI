# phone-1011: phone, LAN and security (OPEN rows 352 to 394), the iPhone sweep, whiteboard handles under pinch

The owner, standing: "I need maximum trust, proper safe connection, proper
security for the lan and open connection". Branch `agent/phone-1011`.

## Rows

- 352 built (lock screen waits for Allow by itself).
- 361 built (live refresh across devices, INBOX 881).
- 384 help line (iPhone Local Network, AdGuard local VPN).
- 386 QR half built (address QR, `core/qrsvg.py`, checked against the `qrcode` package: 112 matrices, 0 different). The plain-http `/lan/trust` page of the same row is not built: it is the plain-http listener 387 asks for.
- 353 to 358: secscan-1011's own findings, built there; not redone.

## Progress
- done: ad53b7e3c (352 lock wait, 361 live refresh, 384 help).
- next: QR commit, then 387/388 decisions, then the iPhone sweep (scratchpad/ui-sweeps/iphone1011.js).
