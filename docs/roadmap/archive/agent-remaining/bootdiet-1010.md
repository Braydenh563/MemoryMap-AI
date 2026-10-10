# bootdiet-1010: what is left

- Boot JS 582,849 gzipped (cap 588,400, headroom 5,551); the 27 counted app scripts total 320,268 (cap 320,300, 32 spare) and app.js 14,281 (cap 14,300). The total cap was already 154 over before this branch (tests/test_static_compression.py `TOTAL_CAP`); the next boot-file addition needs a matching move out of app.js .. agent-activity.js, not a raise.
- Next out of the 27: the meeting overlay's remaining boot listeners (settings-wiring.js "Meeting notes (section 17)": close, backdrop, record, save, discard) could join the ones now in meetings.js, which would drop four more LAZY_ENTRY_POINTS names from app.js.
- Not driven: a cold first palette open on a slow link (the palette bundle names app-features.js, so it arrives with the palette; one request each was measured on localhost only).
