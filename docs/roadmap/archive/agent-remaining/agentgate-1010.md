# agentgate-1010 remaining

- Needle with the server up but no model: `tools_engine` is reported only when the server is down (`routes_models.py` status) and `routes_chat.py` ~2534 falls back to Needle only when `not ollama_running`, so Agent stays greyed there. Owner decision 22 says Needle keeps Agent available; making it true in this state needs the route to treat "server up, no model" as no backend. Not verified against a real model.
- A failed or timed-out status poll (`modelStatus = null`, status.js ~1928) now greys Agent until the next good poll; a slow poll will flicker it. Keep the last good payload if the owner reports flicker.
- Other AI controls still gate on `aiIsOff()` (`ollama_running === false`) and stay enabled with the server up and no model (status.js `syncModelGatedControls`). Same bug class as 778; `model_ready` is the field to move them to.
