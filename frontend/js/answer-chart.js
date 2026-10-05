// A chart under an Ask answer (WORLD_CLASS_PLAN section 17, row 4). Loaded the
// first time an answer carries one (`ensureModule("answerChart")`, app.js).
//
// The server counted the numbers (ai/stat_charts.py), so this file only draws
// them: `{kind: "bar" | "line", title, labels, values, unit, format}` where
// format is count, number or duration (seconds, shown as m:ss). Under the
// picture sits the same rows as a table, because a chart you cannot read the
// numbers of is a decoration, and a Save as PNG button, because a chart is
// the thing people paste into a document.
//
// Colour comes from the page's tokens through classes (css/lazy-answer-chart.css,
// linked here so the boot stylesheets do not carry it), so the chart follows the theme. The PNG export has no
// stylesheet, so it copies each element's computed paint into attributes on a
// clone first.

const CHART_W = 360;
const CHART_LINE_H = 190;
const CHART_BAR_ROW = 22;
const CHART_SVG = "http://www.w3.org/2000/svg";

//: Resolves when the stylesheet is in (or has failed), so a figure is not
//: shown at the SVG's unstyled size for a frame.
const chartStylesReady = new Promise((resolve) => {
  if (document.querySelector('link[href^="/css/lazy-answer-chart.css"]')) return resolve();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/lazy-answer-chart.css" + lazyAssetStamp("/css/lazy-answer-chart.css");
  link.onload = link.onerror = () => resolve();
  document.head.appendChild(link);
});

function chartValueText(value, chart) {
  if (chart.format === "duration") {
    const total = Math.round(value);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = String(total % 60).padStart(2, "0");
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
  }
  const text = String(Math.round(value * 100) / 100);
  return chart.format === "number" && chart.unit ? `${text} ${chart.unit}` : text;
}

function chartEl(tag, attrs, parent, text) {
  const el = document.createElementNS(CHART_SVG, tag);
  for (const [key, value] of Object.entries(attrs || {})) el.setAttribute(key, String(value));
  if (text != null) el.textContent = text;
  if (parent) parent.append(el);
  return el;
}

function chartClip(label, max) {
  const text = String(label);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function drawChartBars(chart) {
  const rows = chart.values.length;
  const labelW = 104;
  const valueW = 34;
  const height = rows * CHART_BAR_ROW + 8;
  const svg = chartEl("svg", { viewBox: `0 0 ${CHART_W} ${height}`, class: "ac-svg" });
  const top = Math.max(1, ...chart.values);
  const room = CHART_W - labelW - valueW;
  chart.values.forEach((value, i) => {
    const y = 4 + i * CHART_BAR_ROW;
    chartEl("text", { x: labelW - 6, y: y + 14, class: "ac-label", "text-anchor": "end" }, svg, chartClip(chart.labels[i], 16));
    chartEl("rect", { x: labelW, y: y + 3, width: Math.max(2, (value / top) * room), height: CHART_BAR_ROW - 8, rx: 2, class: "ac-bar" }, svg);
    chartEl("text", { x: labelW + Math.max(2, (value / top) * room) + 5, y: y + 14, class: "ac-value" }, svg, chartValueText(value, chart));
  });
  return svg;
}

function drawChartLine(chart) {
  const svg = chartEl("svg", { viewBox: `0 0 ${CHART_W} ${CHART_LINE_H}`, class: "ac-svg" });
  const left = 46;
  const right = 12;
  const top = 12;
  const bottom = 28;
  const count = chart.values.length;
  const lowest = Math.min(...chart.values);
  const highest = Math.max(...chart.values);
  // A count starts at zero; a measurement is read for its movement, so its
  // axis hugs the data with a little air.
  const lo = chart.format === "count" ? 0 : lowest - (highest - lowest) * 0.1;
  const hi = chart.format === "count" ? Math.max(1, highest) : highest + (highest - lowest || 1) * 0.1;
  const x = (i) => left + (count < 2 ? (CHART_W - left - right) / 2 : (i / (count - 1)) * (CHART_W - left - right));
  const y = (v) => top + (1 - (v - lo) / (hi - lo || 1)) * (CHART_LINE_H - top - bottom);
  for (const tick of [lo, (lo + hi) / 2, hi]) {
    chartEl("line", { x1: left, x2: CHART_W - right, y1: y(tick), y2: y(tick), class: "ac-grid" }, svg);
    chartEl("text", { x: left - 6, y: y(tick) + 4, class: "ac-label", "text-anchor": "end" }, svg, chartValueText(chart.format === "count" ? Math.round(tick) : tick, { ...chart, unit: "" }));
  }
  chartEl("polyline", { points: chart.values.map((v, i) => `${x(i)},${y(v)}`).join(" "), class: "ac-line", fill: "none" }, svg);
  if (count <= 30) chart.values.forEach((v, i) => chartEl("circle", { cx: x(i), cy: y(v), r: 3, class: "ac-dot" }, svg));
  const marks = count > 2 ? [0, Math.floor((count - 1) / 2), count - 1] : [...chart.values.keys()];
  marks.forEach((i, k) => {
    const anchor = k === 0 && count > 2 ? "start" : k === marks.length - 1 && count > 2 ? "end" : "middle";
    chartEl("text", { x: x(i), y: CHART_LINE_H - 8, class: "ac-label", "text-anchor": anchor }, svg, chartClip(chart.labels[i], 11));
  });
  return svg;
}

function chartTable(chart) {
  const table = document.createElement("table");
  table.className = "md-table answer-chart-table";
  const head = table.createTHead().insertRow();
  for (const text of [chart.kind === "bar" ? "Name" : "When", chart.unit && chart.format !== "number" ? `Value (${chart.unit})` : "Value"]) {
    const th = document.createElement("th");
    th.textContent = text;
    head.append(th);
  }
  const body = table.createTBody();
  chart.labels.forEach((label, i) => {
    const row = body.insertRow();
    row.insertCell().textContent = label;
    row.insertCell().textContent = chartValueText(chart.values[i], chart);
  });
  return table;
}

//: A copy of the live SVG with each element's computed paint written into
//: attributes, so it still looks right once it is a standalone image.
function chartStandalone(svg, width, height) {
  const copy = svg.cloneNode(true);
  const live = [svg, ...svg.querySelectorAll("*")];
  [copy, ...copy.querySelectorAll("*")].forEach((el, i) => {
    const style = getComputedStyle(live[i]);
    for (const prop of ["fill", "stroke", "stroke-width", "font-size", "font-family", "font-weight"]) {
      el.setAttribute(prop, style.getPropertyValue(prop));
    }
  });
  copy.setAttribute("xmlns", CHART_SVG);
  copy.setAttribute("width", width);
  copy.setAttribute("height", height);
  const ground = chartEl("rect", { x: 0, y: 0, width: "100%", height: "100%", fill: getComputedStyle(document.body).backgroundColor });
  copy.prepend(ground);
  return new XMLSerializer().serializeToString(copy);
}

function saveChartPng(svg, chart) {
  const box = svg.viewBox.baseVal;
  const scale = 2;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = box.width * scale;
    canvas.height = box.height * scale;
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return toast("Couldn't save the chart as a picture.", true);
      const name = `${String(chart.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart"}.png`;
      saveFile(name, blob);
    }, "image/png");
  };
  image.onerror = () => toast("Couldn't save the chart as a picture.", true);
  const markup = chartStandalone(svg, box.width * scale, box.height * scale);
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

//: The figure to put under an answer: title, the picture, then Data and Save
//: as PNG. Returns null for a chart with nothing to draw.
function drawAnswerChart(chart) {
  if (!chart || !Array.isArray(chart.values) || !chart.values.length || chart.values.length !== chart.labels?.length) return null;
  const figure = document.createElement("figure");
  figure.className = "answer-chart";
  const title = document.createElement("figcaption");
  title.className = "answer-chart-title";
  title.textContent = chart.title;
  const svg = chart.kind === "line" ? drawChartLine(chart) : drawChartBars(chart);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${chart.title}: ${chart.labels.map((l, i) => `${l} ${chartValueText(chart.values[i], chart)}`).slice(0, 12).join(", ")}`);
  const foot = document.createElement("div");
  foot.className = "answer-chart-foot";
  const data = document.createElement("details");
  data.className = "answer-chart-data";
  const summary = document.createElement("summary");
  summary.textContent = "Data";
  data.append(summary, chartTable(chart));
  const save = smallButton("ph:download-simple Save as PNG", "Save this chart as a picture", () => saveChartPng(svg, chart));
  foot.append(data, save);
  figure.append(title, svg, foot);
  figure.hidden = true;
  chartStylesReady.then(() => {
    figure.hidden = false;
  });
  return figure;
}
