#!/usr/bin/env python3
"""Brief 43 item 6: 60 queries over the showcase notebook, precision at 5.

    bash scratchpad/ui-sweeps/serve.sh 8788 /tmp/mm-showcase
    .venv/bin/python scratchpad/ui-sweeps/seed-showcase.py 8788 /tmp/mm-showcase
    .venv/bin/python scratchpad/search-relevance-1010.py 8788

P@5 here is hits in the top five over min(5, notes that should answer), so a
query with one right answer scores 1.0 when it is first to fifth, not 0.2.
Relevance is a person's judgement of topic ("Portugal" wants every Portugal
note, tags included), written next to each query as the showcase keys that
should answer it. Four classes: exact words, paraphrase (no shared word),
typos, and several concepts at once. Modes: lexical (`hybrid=false`) and the
default hybrid. Without an embedding model the hybrid's meaning signal is
absent, so on a machine with none the two columns differ only by ranking; the
paraphrase class is where a meaning signal would show, and is reported as
measured here, not as the product's ceiling.
"""
import ast
import re
import sys

import requests
from pathlib import Path

PORT = sys.argv[1] if len(sys.argv) > 1 else "8788"
BASE = f"http://127.0.0.1:{PORT}"
src = (Path(__file__).parent / "ui-sweeps" / "seed-showcase.py").read_text()
node = next(n for n in ast.parse(src).body if isinstance(n, ast.AnnAssign) and getattr(n.target, "id", "") == "NOTES")
NOTES = ast.literal_eval(node.value)
TITLE = {k: re.match(r"# (.*)", c).group(1) for k, _cat, _t, c in NOTES}
BY_TITLE = {v: k for k, v in TITLE.items()}



def T(p):
    return [k for k, *_ in NOTES if k.startswith(p)]


PT = T("t_") + ["c_nata", "i_trip"]
HARBOR = ["w_plan", "w_store", "w_email", "w_risks", "w_metrics", "w_roadmap", "w_beta", "w_onboard", "w_pricing", "i_offline"]
HM = ["h_plan", "h_race", "h_week4", "h_fuel", "h_shoes", "h_knee"]
Q = [
 # exact words
 ("exact", "sourdough", ["c_sour", "c_starter", "c_pizza"]),
 ("exact", "Portugal", PT),
 ("exact", "Harbor launch", HARBOR),
 ("exact", "pricing", ["w_pricing", "w_plan", "w_risks"]),
 ("exact", "Pena Palace", ["t_sintra"]),
 ("exact", "foam roll", ["h_knee"]),
 ("exact", "half marathon", HM),
 ("exact", "pastéis de nata", ["c_nata", "t_food"]),
 ("exact", "boiler", ["o_boiler"]),
 ("exact", "feedback loop", ["r_systems", "i_garden"]),
 ("exact", "Douro", ["t_douro", "t_over"]),
 ("exact", "retention", ["w_metrics"]),
 ("exact", "insurance", ["o_insur"]),
 ("exact", "hydration", ["c_sour"]),
 ("exact", "tickets", ["t_trains", "t_sintra", "w_support"]),
 ("exact", "lavender", ["o_garden"]),
 ("exact", "monstera", ["o_plants"]),
 ("exact", "whetstone", ["c_knife"]),
 ("exact", "Alfama", ["t_lisbon"]),
 ("exact", "conflict", ["w_sync", "w_risks"]),
 ("exact", "feedback", ["w_beta", "w_standup", "r_design", "r_systems"]),
 # paraphrase: no word shared with the answer
 ("paraphrase", "baking bread at home", ["c_sour", "c_starter", "c_pizza", "i_bread"]),
 ("paraphrase", "hotel in Lisbon", ["t_lisbon"]),
 ("paraphrase", "knee injury", ["h_knee"]),
 ("paraphrase", "trainers wearing out", ["h_shoes"]),
 ("paraphrase", "cheap train fares", ["t_trains"]),
 ("paraphrase", "how much did the holiday cost", ["t_budget"]),
 ("paraphrase", "what to bring on the trip", ["t_pack"]),
 ("paraphrase", "fixing slow scrolling", ["w_perf"]),
 ("paraphrase", "sleeping better", ["h_sleep"]),
 ("paraphrase", "heating problem", ["o_boiler"]),
 ("paraphrase", "quick dinner ideas", ["c_week", "c_curry", "c_soup"]),
 ("paraphrase", "restaurants and street food", ["t_food"]),
 ("paraphrase", "colour for the office walls", ["o_paint"]),
 ("paraphrase", "mend the bicycle", ["o_bike"]),
 ("paraphrase", "internet speed", ["o_wifi"]),
 ("paraphrase", "ways to build routines", ["r_habits", "i_bread", "i_journal"]),
 ("paraphrase", "sign up form too long", ["w_onboard", "w_beta"]),
 ("paraphrase", "who to hire", ["w_hiring"]),
 ("paraphrase", "app store page", ["w_store", "i_offline"]),
 # typos
 ("typo", "sourdogh", ["c_sour", "c_starter", "c_pizza"]),
 ("typo", "marathn", HM),
 ("typo", "Portugual", PT),
 ("typo", "pricng", ["w_pricing", "w_plan", "w_risks"]),
 ("typo", "lavendar", ["o_garden"]),
 ("typo", "insurence", ["o_insur"]),
 ("typo", "feeback", ["w_beta", "w_standup", "r_design", "r_systems"]),
 ("typo", "chikpea curry", ["c_curry", "c_week"]),
 ("typo", "retrospectve", ["w_retro"]),
 ("typo", "sintra trian", ["t_sintra"]),
 # several concepts
 ("multi", "offline mode beta testers", ["w_beta", "i_offline"]),
 ("multi", "launch email timezone", ["w_email"]),
 ("multi", "train Lisbon Porto", ["t_trains"]),
 ("multi", "long run nutrition", ["h_fuel", "h_plan"]),
 ("multi", "replication sync rewrite", ["r_data", "w_sync"]),
 ("multi", "garden compost", ["i_garden"]),
 ("multi", "roast tomato soup", ["c_soup"]),
 ("multi", "design review affordances", ["r_design"]),
 ("multi", "podcast fewer things", ["r_pod"]),
 ("multi", "race day breakfast", ["h_race"]),
]

def ask(q, hybrid):
    r = S.get(BASE + "/search", params={"q": q, "kind": "note", "limit": 5, "hybrid": str(hybrid).lower()}, timeout=60)
    r.raise_for_status()
    out = []
    for h in r.json()["hits"][:5]:
        t = re.sub(r"^#+\s*", "", (h.get("title") or h.get("text") or h.get("content") or "").split("\n")[0]).strip()
        out.append(BY_TITLE.get(t, "?" + t[:20]))
    return out

S = requests.Session()
status = S.get(BASE + "/auth/status").json()
tok = S.post(BASE + ("/auth/setup" if status.get("setup_required") else "/auth/unlock"), json={"password": "testpassword123"}).json()["token"]
S.headers["X-Auth-Token"] = tok
assert len(Q) == 60, len(Q)
rows = {}
for mode in (False, True):
    for cls, q, rel in Q:
        got = ask(q, mode)
        hit = sum(1 for g in got if g in rel)
        rows.setdefault((mode, cls), []).append((hit / min(5, len(rel)), 1 if got and got[0] in rel else 0, 1 if hit else 0, q, got, rel))
for mode in (False, True):
    print("hybrid" if mode else "lexical")
    allp = []
    for cls in ("exact", "paraphrase", "typo", "multi"):
        r = rows[(mode, cls)]
        allp += r
        n = len(r)
        print(f"  {cls:11s} n={n:2d}  P@5 {sum(x[0] for x in r)/n:.2f}  top1 {sum(x[1] for x in r)/n:.2f}  any-in-5 {sum(x[2] for x in r)/n:.2f}")
    n = len(allp)
    print(f"  {'all':11s} n={n:2d}  P@5 {sum(x[0] for x in allp)/n:.2f}  top1 {sum(x[1] for x in allp)/n:.2f}  any-in-5 {sum(x[2] for x in allp)/n:.2f}")
print("\ntop-1 wrong (hybrid):")
for cls in ("exact", "paraphrase", "typo", "multi"):
    for p, t1, anyhit, q, got, rel in rows[(True, cls)]:
        if not t1:
            print(f"  [{cls}] {q!r}: got {got[:3]}")
print("\nmisses (hybrid, nothing relevant in the top 5):")
for p, t1, anyhit, q, got, rel in rows[(True, "exact")] + rows[(True, "paraphrase")] + rows[(True, "typo")] + rows[(True, "multi")]:
    if not anyhit:
        print(f"  {q!r}: got {got}")
