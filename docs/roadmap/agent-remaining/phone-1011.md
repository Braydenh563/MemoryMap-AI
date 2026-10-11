# phone-1011: phone, LAN and security (OPEN rows 352 to 394), the iPhone sweep, whiteboard handles under pinch

The owner, standing: "I need maximum trust, proper safe connection, proper
security for the lan and open connection". Branch `agent/phone-1011`.

## Rows

- 352 built (lock screen waits for Allow by itself).
- 361 built (live refresh across devices, INBOX 881).
- 384 help line (iPhone Local Network, AdGuard local VPN).
- 386 QR half built (address QR, `core/qrsvg.py`, checked against the `qrcode` package: 112 matrices, 0 different). The plain-http `/lan/trust` page of the same row is not built: it is the plain-http listener 387 asks for.
- 353 to 358: secscan-1011's own findings, built there; not redone.
- 359, 360, 362 to 366, 368 to 371: built before this branch, or covered by the iPhone sweep (step 2) and secscan.
- 367 (model download on the phone): already built.
- 375 (a custom name or mDNS): the computer's `hostname.local` is already in the certificate's names; a name of the owner's choosing is deferred (needs lanserve, lanbar's).
- 376: already in ANALYSIS.md (line 4086).
- 377, 380, 381, 389: statements of the owner's, no work.
- 378, 379, 382, 383, 385: built by lancert's own CA, keyUsage and missing-names check, and lanbar's re-issue.
- 387 (a plain-http listener for the trust page): not built. Recommendation: keep every LAN byte on TLS, as "maximum trust" asks; the QR code (386) carries the https address, and the certificate download stays behind the https page.
- 388 (connection diagnostics): names and expiry are shown already; a handshake-failure count needs core/lanserve.py, lanbar's; deferred to it.
- 390, 393, 394 (gate, ruff, vendor): the gate passes on this base (lints, node-check, ruff); nothing left.
- 391 (drawio UML): not a phone row; left for the whiteboard owner.
- 392 (cold boot at phone width): the iPhone sweep boots at 390 and 430 every run.

## Progress
- done: ad53b7e3c (352 lock wait, 361 live refresh, 384 help).
- next: QR commit, then 387/388 decisions, then the iPhone sweep (scratchpad/ui-sweeps/iphone1011.js).
