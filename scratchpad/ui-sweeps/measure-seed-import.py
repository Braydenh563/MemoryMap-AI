"""measure-1010: faster seed through POST /import/markdown (500 files max per request).
python measure-seed-import.py PORT FIRST COUNT BATCH"""
import random
import sys
import time

import requests

port, first, count, batch = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
base = f"http://127.0.0.1:{port}"
tok = requests.post(f"{base}/auth/unlock", json={"password": "testpassword123"}, timeout=30).json()["token"]
h = {"X-Auth-Token": tok}
words = "garden dentist budget recipe travel project meeting reading health idea invoice plan holiday workout summary draft".split()
rnd = random.Random(first)
t0 = time.time()
done = 0
while done < count:
    n = min(batch, count - done)
    files = []
    for j in range(n):
        i = first + done + j
        body = " ".join(rnd.choice(words) for _ in range(40))
        files.append(("files", (f"note-{i}.md", f"Note {i}: {body}".encode(), "text/markdown")))
    r = requests.post(f"{base}/import/markdown", files=files, headers=h, timeout=600)
    print(r.status_code, r.text[:120], round(time.time() - t0, 1), flush=True)
    r.raise_for_status()
    done += n
print({"imported": done, "seconds": round(time.time() - t0, 1)})
