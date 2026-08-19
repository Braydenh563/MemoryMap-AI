import sys

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = """            <div class="settings-group">
              <h3>Export data</h3>
              <div class="row">
                <button id="export-json" class="small ghost">JSON</button>
                <button id="export-markdown" class="small ghost">Markdown</button>
                <button id="export-csv" class="small ghost">CSV</button>
              </div>
              <p class="muted">
                JSON contains everything in one file. Markdown creates a folder
                of notes with frontmatter.
              </p>
            </div>"""

replacement = """            <div class="settings-group">
              <h3>Export data</h3>
              <div class="row">
                <button id="export-json" class="small ghost">JSON</button>
                <button id="export-markdown" class="small ghost">Markdown</button>
                <button id="export-csv" class="small ghost">CSV</button>
              </div>
              <div class="row" style="margin-top: var(--space-2);">
                <button id="export-backup-zip" class="small primary">Export Full Backup (.zip)</button>
              </div>
              <p class="muted">
                JSON contains everything in one file. Markdown creates a folder
                of notes with frontmatter. CSV exports tabular data. Full Backup creates a portable zip with your database and all media.
              </p>
            </div>"""

if target not in content:
    print("Target not found!")
    sys.exit(1)

content = content.replace(target, replacement)

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html updated.")
