"""measure-1010: server CPU seconds (from /proc/PID/stat utime+stime) per request, which a loaded machine does not inflate
the way wall time is.  python measure-cpu.py PORT PID
The wall time of the same request is printed beside it."""
import os
import sys
import time

import requests
from pathlib import Path

port, pid = sys.argv[1], int(sys.argv[2])
base = f"http://127.0.0.1:{port}"
tick = os.sysconf("SC_CLK_TCK")
def cpu():
    f = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
    return (int(f[11]) + int(f[12])) / tick
tok = requests.post(f"{base}/auth/unlock", json={"password": "testpassword123"}, timeout=30).json()["token"]
h = {"X-Auth-Token": tok}
def p50(a):
    a = sorted(a)
    return a[len(a) // 2]


for name, url in [("static /", "/"), ("entries?limit=1", "/entries?limit=1"), ("search/stats", "/search/stats"),
                  ("search garden hybrid", "/search?q=garden&limit=20"), ("search garden keyword", "/search?q=garden&limit=20&hybrid=false"),
                  ("search dentist budget hybrid", "/search?q=dentist%20budget&limit=20"), ("search Note 4242 hybrid", "/search?q=Note%204242&limit=20"),
                  ("search Note 4242 keyword", "/search?q=Note%204242&limit=20&hybrid=false")]:
    cs, ws = [], []
    for _ in range(11):
        c0, t0 = cpu(), time.time()
        requests.get(base + url, headers=h, timeout=60)
        ws.append(time.time() - t0)
        cs.append(cpu() - c0)
        time.sleep(0.3)
    print(f"{name:32s} cpu p50 {p50(cs[1:])*1000:7.0f} ms   wall p50 {p50(ws[1:])*1000:7.0f} ms")
