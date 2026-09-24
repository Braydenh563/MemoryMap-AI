// The generated characters' sheet (avatars.js, `drawCharacter`): each name
// as the full figure at 104px wide, its head mark at 104px and at 28px, on
// the app's own card, with animation off so each face is its resting frame,
// and the reading it was drawn from printed under it. Writes
// $SCRATCH/shots/faces-<TAG>-<theme>.png and prints the readings as JSON.
//
//   BASE=http://127.0.0.1:8821 THEME=dark TAG=after SCRATCH=/tmp/x \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node facesheet.js
// NAMES="a,b,c" draws those names instead of the default set; LOOK_LEAN=
// feminine or masculine sets Appearance, Face looks for the sheet.
const { boot } = require("./lib.js");

const DEFAULT_NAMES = [
  "Brayden", "Sushicraft563", "SushiLord", "sushilord563 gaming", "pandaSushi101",
  "Sarah", "Mohammed", "Li Wei", "Aroha", "Uwu wink wink ahhhhhh ur cooked buddy",
  "xX_DarkSlayer_Xx", "Coffee Queen", "Captain Pixel", "a", "12345",
  "Olivia", "Marcus", "Priya", "Jonah", "Elena",
];

(async () => {
  const names = (process.env.NAMES || "").split(",").map((s) => s.trim()).filter(Boolean);
  const list = names.length ? names : DEFAULT_NAMES;
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: Number(process.env.SCALE || 1) });
  const theme = process.env.THEME || "light";
  const info = await page.evaluate(([list, lean]) => {
    document.documentElement.dataset.avatarMotion = "off";
    if (lean) localStorage.setItem("face-look", lean);
    //: "Name|hair=bob|mood=calm" draws Name with those parts of its style
    //: (or reading) set, for a sheet of one part's variants.
    const read = nameMood;
    nameMood = (seed) => {
      const [base, ...sets] = String(seed || "").split("|");
      const reading = read(base);
      for (const pair of sets) {
        const [key, value] = pair.split("=");
        if (key in reading.style) reading.style[key] = value;
        else reading[key] = value;
      }
      return reading;
    };
    const sheet = document.createElement("div");
    sheet.id = "face-sheet";
    for (const [k, v] of Object.entries({
      position: "fixed", inset: "0", zIndex: "9999", overflow: "auto", padding: "12px",
      display: "grid", gridTemplateColumns: "repeat(5, 262px)", gap: "8px",
      alignContent: "start", background: "var(--bg)",
    })) sheet.style[k] = v;
    document.body.appendChild(sheet);
    const readings = {};
    for (const name of list) {
      const cell = document.createElement("div");
      for (const [k, v] of Object.entries({ display: "grid", justifyItems: "center", gap: "4px", padding: "8px", borderRadius: "12px", background: "var(--card)", border: "1px solid var(--border)" })) cell.style[k] = v;
      const row = document.createElement("div");
      for (const [k, v] of Object.entries({ display: "flex", alignItems: "flex-end", gap: "8px" })) row.style[k] = v;
      //: The figure sits in `.nm-figure`, as the companion's does, so the
      //: prop slots and the raised arms stay hidden the way the CSS hides them.
      const figure = document.createElement("span");
      figure.className = "nm-figure";
      figure.appendChild(drawCharacter(name, 104, "figure"));
      row.appendChild(figure);
      row.appendChild(drawCharacter(name, 104, "mark"));
      row.appendChild(nameMark(name, 28));
      const label = document.createElement("small");
      label.textContent = name.length > 34 ? `${name.slice(0, 33)}...` : name;
      label.style.color = "var(--ink)";
      const r = nameMood(name);
      readings[name] = { mood: r.mood, animal: r.animal, props: r.props, hand: r.hand, look: r.look, hair: r.style.hair, acc: r.style.accessories, outfit: r.style.outfit, flavours: r.flavours, cues: r.cues };
      cell.append(row, label);
      sheet.appendChild(cell);
      //: "Nothing overlaps the eyes": what sits on the head (a hat, a clip,
      //: a bow) measured against the eyes, in the mark's own units.
      const mark = row.children[1];
      //: The space helmet is a glass bubble round the whole head, by design.
      const eyes = r.props.includes("helmet") ? null : mark.querySelector(".nm-eyes")?.getBBox();
      //: Measured by geometry, not boxes: a hood's rim or headphones' band
      //: wraps the face without touching the eyes, so each shape is asked
      //: whether its fill or stroke covers any of nine points on each eye.
      const points = [];
      if (eyes) {
        for (const cx of [eyes.x + eyes.width * 0.2, eyes.x + eyes.width * 0.8]) {
          for (const [dx, dy] of [[0, 0], [2.5, 0], [-2.5, 0], [0, 3], [0, -3], [1.8, 2], [-1.8, 2], [1.8, -2], [-1.8, -2]]) {
            points.push(new DOMPoint(cx + dx, eyes.y + eyes.height / 2 + dy));
          }
        }
      }
      for (const worn of mark.querySelectorAll(".nm-hat, .nm-clip, .nm-bow")) {
        for (const shape of worn.querySelectorAll("path, circle, ellipse, rect, polygon")) {
          const fills = shape.getAttribute("fill") !== "none";
          if (points.some((pt) => (fills && shape.isPointInFill(pt)) || shape.isPointInStroke(pt))) {
            readings[name].overEyes = (readings[name].overEyes || []).concat(worn.getAttribute("class"));
            break;
          }
        }
      }
    }
    return readings;
  }, [list, process.env.LOOK_LEAN || ""]);
  await page.waitForTimeout(500);
  const file = `${OUT}/faces-${process.env.TAG || "sheet"}-${theme}${process.env.LOOK_LEAN ? "-" + process.env.LOOK_LEAN : ""}.png`;
  await (await page.$("#face-sheet")).screenshot({ path: file });
  console.log(JSON.stringify(info, null, 0));
  console.log(file);
  await browser.close();
})();
