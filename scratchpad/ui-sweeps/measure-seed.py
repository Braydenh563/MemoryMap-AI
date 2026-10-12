"""measure-1010 seed: N notes through POST /entries, timed.  python measure-seed.py 8794 5000"""
import random
import sys
import time

import requests

port, count = sys.argv[1], int(sys.argv[2])
base = f"http://127.0.0.1:{port}"
tok = requests.post(f"{base}/auth/unlock", json={"password": "testpassword123"}, timeout=30).json()["token"]
h = {"X-Auth-Token": tok}
words = "garden dentist budget recipe travel project meeting reading health idea invoice plan holiday workout summary draft".split()
cats = ["Work", "Health", "Ideas", "Reading", "Travel", "Recipes", "Garden"]
rnd = random.Random(int(sys.argv[3]) if len(sys.argv) > 3 else 7)
base_i = int(sys.argv[4]) if len(sys.argv) > 4 else 0
s = requests.Session()
t0 = time.time()
for i in range(count):
    body = " ".join(rnd.choice(words) for _ in range(40))
    r = s.post(f"{base}/entries", json={"content": f"Note {base_i + i}: {body}", "category": cats[i % 7]}, headers=h, timeout=120)
    r.raise_for_status()
    if i % 500 == 0:
        print(i, round(time.time() - t0, 1), flush=True)
print({"notes": count, "seconds": round(time.time() - t0, 1)})
