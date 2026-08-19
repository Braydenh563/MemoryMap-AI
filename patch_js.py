import sys

with open('frontend/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

import_dir_code = """
async function importDirectory() {
  const pathInput = $("import-dir-path").value.trim();
  const status = $("import-dir-status");
  if (!pathInput) {
    status.textContent = "Please enter a directory path.";
    return;
  }
  status.textContent = "Starting import...";
  try {
    const response = await apiJson("/import/directory", {
      method: "POST",
      body: { path: pathInput },
    });
    status.textContent = "Import started in the background. Check your library soon.";
    $("import-dir-path").value = "";
  } catch (error) {
    status.textContent = error.message;
  }
}
"""

if "function importDirectory()" not in content:
    target = "async function importMarkdown() {"
    content = content.replace(target, import_dir_code + "\n" + target)

listeners_code = """$("import-dir")?.addEventListener("click", importDirectory);

for (const fmt of ["json", "markdown", "csv", "backup-zip"]) {
  const btn = $(`export-${fmt}`);
  if (btn) {
    btn.addEventListener("click", () => {
      let path = fmt === "backup-zip" ? "/export/backup" : `/export/${fmt}`;
      window.location.href = path + `?token=${authToken()}`;
    });
  }
}"""

if "importDirectory" in listeners_code:
    target_listener = "$(\"import-md\").addEventListener(\"click\", importMarkdown);"
    if target_listener in content and "$(\"import-dir\")" not in content:
        content = content.replace(target_listener, target_listener + "\n" + listeners_code)

with open('frontend/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("app.js updated.")
