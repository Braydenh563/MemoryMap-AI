import sys

with open('frontend/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """for (const id of ["timeline-scale", "timeline-group", "timeline-days"]) {
  const el = $(id);
  if (!el) continue;
  el.addEventListener("change", renderTimeline);
}"""

replacement = """for (const id of ["timeline-scale", "timeline-group"]) {
  const el = $(id);
  if (!el) continue;
  el.addEventListener("change", renderTimeline);
}

const timelineDays = $("timeline-days");
if (timelineDays) {
  timelineDays.addEventListener("change", () => {
    const isCustom = timelineDays.value === "custom";
    const customRangeEl = $("timeline-custom-range");
    if (customRangeEl) {
      customRangeEl.classList.toggle("hidden", !isCustom);
    }
    if (!isCustom || ($("timeline-start-date").value && $("timeline-end-date").value)) {
      renderTimeline();
    }
  });
}

const ts = $("timeline-start-date");
if (ts) {
  ts.addEventListener("change", () => {
    if ($("timeline-end-date").value) renderTimeline();
  });
}

const te = $("timeline-end-date");
if (te) {
  te.addEventListener("change", () => {
    if ($("timeline-start-date").value) renderTimeline();
  });
}

const jt = $("timeline-jump-today");
if (jt) {
  jt.addEventListener("click", () => {
    const branchWrap = $("timeline-branch-wrap");
    const scrollContainer = !$("timeline-scroll").classList.contains("hidden") ? $("timeline-scroll") : branchWrap;
    
    if (scrollContainer) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (scrollContainer === branchWrap) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: smooth ? "smooth" : "auto" });
      } else {
        scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: smooth ? "smooth" : "auto" });
      }
    }
  });
}"""

if target not in content:
    print("Target not found!")
    sys.exit(1)

content = content.replace(target, replacement)

with open('frontend/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced successfully!")
