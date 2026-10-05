"""gl1005: a notebook shaped like a real one for the graph layout sweep.

Several categories, threads (replies), and links, through the app's own
routes.  python gl1005-seed.py 8861 [count]
"""

import random
import sys

import requests

port = sys.argv[1]
count = int(sys.argv[2]) if len(sys.argv) > 2 else 120
base = f"http://127.0.0.1:{port}"
token = requests.post(f"{base}/auth/unlock", json={"password": "testpassword123"}, timeout=30).json()["token"]
h = {"X-Auth-Token": token}
cats = ["Work", "Health", "Ideas", "Reading", "Travel", "Recipes", "Garden"]
rnd = random.Random(5)
ids = []
for i in range(count):
    body = {"content": f"Seed note {i} about {cats[i % len(cats)].lower()} and more words here", "category": cats[i % len(cats)]}
    if ids and i % 5 == 0:
        body["parent_id"] = rnd.choice(ids)
    r = requests.post(f"{base}/entries", json=body, headers=h, timeout=60)
    r.raise_for_status()
    ids.append(r.json()["id"])
ok = 0
for _ in range(count):
    a, b = rnd.sample(ids, 2)
    r = requests.post(f"{base}/entries/{a}/links", json={"target_id": b}, headers=h, timeout=30)
    ok += r.ok
print({"notes": len(ids), "links": ok})
