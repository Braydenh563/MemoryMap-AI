// ask-chart.js: a chart drawn from a counting or trend question asked in the
// Ask box (WORLD_CLASS_PLAN section 17 row 4, "charts from questions").
//
// Lazy, in the Ask history's bundle (app.js `LAZY_MODULES.askHistory`): the
// Ask box asks for it only when a question reads as a count ("how many notes
// per category this month", "notes per week in 2026"), so nothing here runs on
// an ordinary question. The numbers come from `POST /charts/question`
// (routes_vision.py), which reads the words with no model and counts the
// records, so the chart is the same with the model off; the answer under it is
// whatever the model says, and the chart does not wait for it.
//
// The recipe (DESIGN.md, "A chart answering a question"): one `.ask-chart`
// card above the answer, its title and a total, an SVG of bars (a category or
// a tag) or a line (time), drawn from the theme's tokens through classes so
// both themes hold, the same numbers as a table under it, and Save as PNG. The
// SVG is the one picture; the table is what a screen reader reads.

const ASK_CHART_W = 640;
const ASK_CHART_H = 220;
const ASK_CHART_PAD = { top: 12, right: 12, bottom: 44, left: 36 };
const SVG_NS = "http://www.w3.org/2000/svg";

function askChartSvgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

//: Round numbers for the axis: 0 and the top, and a middle when there is room.
function askChartTicks(max) {
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i);
  const step = Math.ceil(max / 4);
  return [0, step, step * 2, step * 3, step * 4];
}

function askChartLabel(chart, label) {
  if (chart.by === "month") {
    const [y, m] = label.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  if (chart.by === "day" || chart.by === "week") {
    return new Date(`${label}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}

function askChartSvg(chart) {
  const rows = chart.rows;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const ticks = askChartTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const { top: pt, right: pr, bottom: pb, left: pl } = ASK_CHART_PAD;
  const plotW = ASK_CHART_W - pl - pr;
  const plotH = ASK_CHART_H - pt - pb;
  const y = (value) => pt + plotH - (value / top) * plotH;
  const svg = askChartSvgEl("svg", { viewBox: `0 0 ${ASK_CHART_W} ${ASK_CHART_H}`, class: "ask-chart-svg", role: "img" });
  svg.setAttribute("aria-label", `${chart.title}, as a ${chart.kind === "bar" ? "bar" : "line"} chart; the table below has the numbers`);
  for (const tick of ticks) {
    svg.appendChild(askChartSvgEl("line", { x1: pl, x2: ASK_CHART_W - pr, y1: y(tick), y2: y(tick), class: "ask-chart-grid" }));
    const text = askChartSvgEl("text", { x: pl - 6, y: y(tick) + 4, "text-anchor": "end", class: "ask-chart-axis" });
    text.textContent = String(tick);
    svg.appendChild(text);
  }
  const slot = plotW / Math.max(1, rows.length);
  //: Every label when they fit, else every nth: a label per day of a month
  //: is thirty words on top of each other.
  const every = Math.max(1, Math.ceil(rows.length / Math.floor(plotW / 54)));
  rows.forEach((row, i) => {
    const cx = pl + slot * i + slot / 2;
    if (i % every === 0) {
      const text = askChartSvgEl("text", { x: cx, y: ASK_CHART_H - pb + 16, "text-anchor": "middle", class: "ask-chart-axis" });
      text.textContent = askChartLabel(chart, row.label);
      svg.appendChild(text);
    }
    if (chart.kind === "bar") {
      const w = Math.max(2, Math.min(48, slot * 0.7));
      const bar = askChartSvgEl("rect", { x: cx - w / 2, y: y(row.value), width: w, height: Math.max(0, pt + plotH - y(row.value)), rx: 3, class: "ask-chart-bar" });
      const tip = askChartSvgEl("title");
      tip.textContent = `${row.label}: ${row.value}`;
      bar.appendChild(tip);
      svg.appendChild(bar);
    }
  });
  if (chart.kind !== "bar") {
    const points = rows.map((row, i) => `${(pl + slot * i + slot / 2).toFixed(1)},${y(row.value).toFixed(1)}`).join(" ");
    svg.appendChild(askChartSvgEl("polyline", { points, class: "ask-chart-line" }));
    rows.forEach((row, i) => {
      const dot = askChartSvgEl("circle", { cx: pl + slot * i + slot / 2, cy: y(row.value), r: rows.length > 40 ? 1.5 : 3, class: "ask-chart-dot" });
      const tip = askChartSvgEl("title");
      tip.textContent = `${row.label}: ${row.value}`;
      dot.appendChild(tip);
      svg.appendChild(dot);
    });
  }
  return svg;
}

function askChartTable(chart) {
  const wrap = document.createElement("details");
  wrap.className = "ask-chart-numbers";
  const summary = document.createElement("summary");
  summary.textContent = "The numbers";
  const table = document.createElement("table");
  table.className = "ask-chart-table";
  const head = table.createTHead().insertRow();
  //: `columns` names a chart that is not notes counted (the Statistics
  //: page's Most used: a feature and its uses).
  for (const name of chart.columns || [{ category: "Category", tag: "Tag" }[chart.by] || "When", "Notes"]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = name;
    head.appendChild(th);
  }
  const body = table.createTBody();
  for (const row of chart.rows) {
    const tr = body.insertRow();
    tr.insertCell().textContent = row.label;
    tr.insertCell().textContent = String(row.value);
  }
  wrap.append(summary, table);
  return wrap;
}

//: The chart as a PNG: the SVG with its resolved colours written onto each
//: mark (a file has no stylesheet), on the card's own flat background.
async function askChartPng(svg, title) {
  const clone = svg.cloneNode(true);
  const live = [svg, ...svg.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  live.forEach((el, i) => {
    const style = getComputedStyle(el);
    for (const prop of ["fill", "stroke", "stroke-width", "font-size", "font-family", "opacity"]) {
      copies[i].setAttribute(prop, style.getPropertyValue(prop));
    }
  });
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", ASK_CHART_W * 2);
  clone.setAttribute("height", ASK_CHART_H * 2);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Couldn't draw the chart."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = ASK_CHART_W * 2;
    canvas.height = ASK_CHART_H * 2;
    const ctx = canvas.getContext("2d");
    //: A flat card colour per theme, as the graph's PNG does: the page's own
    //: background is a gradient and a translucent card, neither a fill.
    ctx.fillStyle = document.documentElement.dataset.theme === "dark" ? "rgb(27, 30, 38)" : "rgb(255, 255, 255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((made) => (made ? resolve(made) : reject(new Error("Couldn't save the chart."))), "image/png")
    );
    const name = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart"}.png`;
    await saveFile(name, blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

//: Draws the chart for `question` into `host`, or leaves it hidden when the
//: question is not a count. `isCurrent` says whether this question is still
//: the one on screen, so a slow answer never draws over a newer one.
async function renderAskChart(question, host, isCurrent = () => true) {
  const answer = await apiJson("/charts/question", {
    method: "POST",
    body: JSON.stringify({ question }),
    readOnly: true,
    silent: true,
    //: Nobody pressed anything for the chart: a failure is the console's
    //: (`backgroundWriteFailed`), and the answer above it stands alone.
  }).catch(backgroundWriteFailed);
  if (!isCurrent()) return;
  drawAskChart(host, answer && answer.chart);
}

//: The drawing alone, from a chart object: the Ask box's fetched one above,
//: and a Chat answer's bar of counts (CHAT_PLAN decision 59, step 2: a
//: `chart` stream event from `realise.chart`, drawn by chat-attach.js).
function drawAskChart(host, chart) {
  if (!chart || !chart.rows || !chart.rows.length) {
    host.replaceChildren();
    host.classList.add("hidden");
    return;
  }
  const head = document.createElement("div");
  head.className = "ask-chart-head";
  const title = document.createElement("strong");
  title.className = "ask-chart-title";
  title.textContent = chart.title;
  const total = document.createElement("span");
  total.className = "muted text-sm";
  const source = chart.source || "from your notes";
  if (chart.total != null) total.textContent = `${chart.total.toLocaleString()} in all, ${source}`;
  else total.textContent = source[0].toUpperCase() + source.slice(1);
  const svg = askChartSvg(chart);
  const save = smallButton("ph:download-simple Save as PNG", "Save this chart as a picture", () =>
    askChartPng(svg, chart.title).catch((error) => toast(error.message, true))
  );
  head.append(title, total, save);
  host.replaceChildren(head, svg, askChartTable(chart));
  host.classList.remove("hidden");
}
