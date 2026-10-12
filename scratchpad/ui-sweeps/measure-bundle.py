"""measure-1010 item 8: POST /backups/bundle on a 20-note data dir; lists the zip's members.
python scratchpad/ui-sweeps/measure-bundle.py 8795   (server on a fresh data dir)"""
import io
import sys
import time
import zipfile

import requests
import os
import sqlite3
import tempfile

b = f"http://127.0.0.1:{sys.argv[1]}"
pw = "testpassword123"
requests.post(f"{b}/auth/setup", json={"password": pw}, timeout=30)
h = {"X-Auth-Token": requests.post(f"{b}/auth/unlock", json={"password": pw}, timeout=30).json()["token"]}
for i in range(20):
    requests.post(f"{b}/entries", json={"content": f"Bundle note {i} about gardens"}, headers=h, timeout=60).raise_for_status()
# one attachment so media/uploads folders exist
png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082")
r = requests.post(f"{b}/media/upload", files={"file": ("dot.png", png, "image/png")}, headers=h, timeout=60)
print("media upload", r.status_code, r.text[:100])
t = time.time()
r = requests.post(f"{b}/backups/bundle", json={}, headers=h, timeout=120)
print("bundle", r.status_code, len(r.content), "bytes", round(time.time() - t, 2), "s")
z = zipfile.ZipFile(io.BytesIO(r.content))
for i in z.infolist():
    print(" ", i.filename, i.file_size)
d = tempfile.mkdtemp(prefix="mm-bundle-")
z.extract("memorymap.db", d)
c = sqlite3.connect(os.path.join(d, "memorymap.db"))
tabs = [r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")]
print("db tables", len(tabs))
for t in ("entries", "entry_revisions", "documents", "whiteboard_boards", "chat_messages", "reminders", "settings"):
    try:
        print(" ", t, c.execute(f"select count(*) from {t}").fetchone()[0])
    except sqlite3.Error as e:
        print(" ", t, "-", e)
