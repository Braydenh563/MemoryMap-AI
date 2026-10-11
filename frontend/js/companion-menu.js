// companion-menu.js: the companion's menu and the enlarged view of a face,
// moved out of avatars.js on 2026-10-05 for the boot-script gzip budget
// (tests/test_boot_budget.py). Both open only on a gesture (a press, a right
// click, a double-click or a long press on the companion or a face), so the
// boot carries stand-ins (`LAZY_ENTRY_POINTS.companionMenu`, app.js) that
// fetch this file on first use and then call the real function.

//: **The large view.** A click on a face that is not part of a control
//: opens it big, animated, with what it was read as, so the joke can be
//: seen at a size where it lands.
//:
//: **The companion comes into it itself** (INBOX 443, the owner: "if the
//: companion is doing a specific action and i double click it to view it in
//: the enlarged window, I want it to keep doing that action unless poked or
//: something else happens"). Opened from the companion (`visit`), the large
//: view is not a new drawing of it: the companion's own element moves into
//: the card for as long as the card is open (`nameMarkBuddyVisit`), so its
//: act, its face, its props, its sleep and its pose are the ones it had,
//: and its own timer ends the act when the act ends. A poke is its own
//: click handler; an app event its own cue. Closing sends it home to the
//: perch it left.
//:
//: **And alive while you watch** (the owner: "needs more life and not just
//: a statue"): its beat is every 2.5 to 6 seconds in here rather than 20 to
//: 60 (`nameMarkBuddySchedule`), its eyes and head follow the pointer across
//: the whole card (`nameMarkBuddyHeadAt`), a hover pets it, and it says one
//: of its lines now and then (`nameMarkViewerChatter`). Any other face gets
//: the same: the shared idle acts at the view's own quicker beat.
//: Under reduced motion it only blinks, gently (`nameMarkViewerBlinks`).
function openNameMarkViewer(seed, { visit = false } = {}) {
  //: One at a time: a double-click opens it once.
  if (document.querySelector(".nm-viewer")) return;
  const opener = document.activeElement;
  const openedAt = performance.now();
  const buddy = visit ? document.getElementById("nm-buddy") : null;
  const visiting = !!buddy && (buddy.dataset.seed || "") === (seed || "") && !buddy.classList.contains("nmb-away");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay nm-viewer";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `${seed || "Face"}, enlarged`);
  const card = document.createElement("div");
  card.className = "card modal-card nm-viewer-card";
  //: The dialog-head recipe (DESIGN.md, "A dialog's head"): its name, then
  //: the icon X. Close was a word button at the foot.
  const head = document.createElement("div");
  head.className = "dialog-head nm-viewer-head";
  const name = document.createElement("h2");
  name.className = "dialog-head-title nm-viewer-name";
  name.textContent = seed || "Unnamed";
  const actions = document.createElement("span");
  actions.className = "dialog-head-actions";
  //: The companion's own face is a button, so the stage around it is not
  //: one; any other face is drawn inside a button that pokes it.
  const stage = document.createElement(visiting ? "div" : "button");
  stage.className = "nm-viewer-stage";
  if (!visiting) {
    stage.type = "button";
    stage.title = "Poke it";
  }
  //: The whole character, as the companion draws it, at 2.2 times.
  const figure = document.createElement("span");
  figure.className = "nm-viewer-figure";
  if (visiting) {
    //: What it sits on, drawn only for that pose (the CSS).
    const ledge = document.createElement("span");
    ledge.className = "nm-viewer-ledge";
    ledge.setAttribute("aria-hidden", "true");
    figure.appendChild(ledge);
  } else figure.appendChild(characterFor(seed).figure());
  stage.appendChild(figure);
  //: One line of description: what it is.
  const reading = document.createElement("p");
  reading.className = "muted nm-viewer-reading";
  //: Atlas is not a face read from its name (its reading gave "Calm face
  //: with shades", which describes nothing on the screen): it says who it is.
  //: A face with nothing read from its name used to say "A face of its
  //: own", which says nothing (the owner): now what it is.
  reading.textContent = isAtlasSeed(seed) ? "The app's own guide" : nameMarkTitle(nameMood(seed)) || "Its own face, read from its name";
  let home = null;
  let chatter = 0;
  let blinks = 0;
  const shut = () => {
    clearTimeout(chatter);
    clearTimeout(blinks);
    if (home) home();
    home = null;
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
    if (opener && typeof opener.focus === "function" && opener.isConnected) opener.focus();
  };
  const close = smallButton("ph:x", "Close", shut);
  close.classList.add("icon-only", "dialog-head-btn");
  actions.appendChild(close);
  head.append(name, actions);
  card.append(head, stage, reading);
  overlay.appendChild(card);
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      shut();
    }
  };
  if (!visiting) {
    stage.addEventListener("click", () => {
      nameMarkReact(stage.querySelector(".name-mark"));
      nameMarkSay(stage, nameMarkLine(seed));
    });
  }
  //: Not closed by the second click of the double-click that opened it:
  //: a click on the ground within 400ms of opening is that click.
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay && performance.now() - openedAt > 400) shut();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  if (visiting) home = nameMarkBuddyVisit(figure);
  if (visiting && !home) figure.appendChild(characterFor(seed).figure());
  nameMarkViewerFit(figure);
  requestAnimationFrame(() => nameMarkViewerFit(figure));
  close.focus();
  //: Its lines, one every 7 to 13 seconds while the view is open; not
  //: asleep, not under a line it has just been poked into saying.
  const talk = () => {
    chatter = setTimeout(() => {
      if (!overlay.isConnected) return;
      const asleep = !!home && nameMarkBuddyAsleep(document.getElementById("nm-buddy"));
      const host = home ? document.getElementById("nm-buddy") : stage;
      if (!asleep && host && !host.querySelector(":scope > .nm-say")) nameMarkSay(host, nameMarkLine(seed));
      talk();
    }, 7000 + Math.random() * 6000);
  };
  talk();
  if (nameMarkIdleQuiet()) {
    blinks = nameMarkViewerBlinks(figure);
    return;
  }
  //: Alive while it is open: a first small act soon, then the view's beat,
  //: and its eyes and head on the pointer (INBOX 591; its loops are the
  //: CSS's, under `.nm-viewer-figure > .nm-figure.nm-live`).
  if (!home) {
    setTimeout(() => figure.isConnected && nameMarkIdleAct(figure, "glance"), 900);
    nameMarkIdleWake();
    nameMarkViewerFollow(overlay, figure);
  }
}

//: **Its menu opens at it** (INBOX 426 p, the owner: "the right click
//: companion dropdown menu doesnt appear where the companion is"). However
//: it was opened (a right-click, a hold, the keyboard), the menu is placed
//: from the companion's own box: beside it on the side with room, its top
//: level with the companion's, kept inside the window. `openMenuAtPoint`
//: builds it (the app's one menu), and it is then shifted by a `translate`
//: to that place, which leaves how the menu was positioned alone. While it
//: is open the companion does not go anywhere on its own.
//:
//: **Opened by the pointer, it opens at the pointer** (INBOX 426 x, 84.png,
//: round 4): `at` is where a right-click or a long press was, and the menu
//: opens there, the way every other context menu does; from the keyboard
//: it opens beside the companion's box. And a move already under way stops
//: where it is drawn: measured at 1.25 and 1.5 scale, a right-click mid-walk
//: or mid-poof opened the menu at the companion and the move then carried
//: the companion 69 to 136px away from it. Its next place is chosen on its
//: own beat, once the menu has closed.
function nameMarkBuddyMenu(buddy, at = null) {
  if (typeof openMenuAtPoint !== "function") return;
  const face = buddy.querySelector(".nm-buddy-face");
  if (nmb.anim && nmb.anim.playState === "running") {
    const drawn = buddy.getBoundingClientRect();
    nmb.anim.cancel();
    nmb.hopAnim?.cancel();
    buddy.classList.remove("nmb-walking", "nmb-poofing");
    nmb.glue = null;
    nameMarkBuddyWatch();
    nameMarkBuddyRide(null, Math.round(drawn.left), Math.round(drawn.top));
    buddy.dataset.pose = nmb.pose = "float";
    buddy.dataset.legs = nmb.legs = "";
    nameMarkBuddyQueuePlace();
  }
  const tab = nameMarkBuddyTab();
  const spots = nameMarkBuddySpots();
  const items = [
    { group: "say", label: "ph:hand-waving Say hello", run: () => face.click() },
    { group: "say", label: "ph:arrows-out Enlarge", run: () => openNameMarkViewer(buddy.dataset.seed || "", { visit: true }) },
    //: **Pinned means pinned** (INBOX 426 l, the owner: "when I press the
    //: option to stay in the same spot across pages ... it still moves"):
    //: the place on screen and the pose are kept, and nothing but you moves
    //: it again (no perch, no errand, no beat) until you drag it or call it
    //: back.
    { group: "place", label: "ph:push-pin Stay here on every page", run: () => {
      //: Where it is drawn now: mid-walk, `nmb.x` is where it was going,
      //: and pinning there made it jump at the moment it was told to stay.
      const box = buddy.getBoundingClientRect();
      const x = Math.round(box.left);
      const y = Math.round(box.top);
      nmb.anim?.cancel();
      nmb.hopAnim?.cancel();
      nameMarkBuddyKeepSpots({ "*": { x, y, pose: nmb.pose, legs: nmb.legs, side: buddy.dataset.side || "", w: innerWidth, h: innerHeight, keep: 1 } });
      nameMarkBuddyMoveTo(buddy, { kind: "pinned", x, y, pose: nmb.pose, legs: nmb.legs, side: buddy.dataset.side || "" }, true);
    } },
  ];
  if (spots[tab]) {
    items.push({ group: "place", label: "ph:push-pin-slash Let it choose its spot here", run: () => {
      const next = { ...spots };
      delete next[tab];
      nameMarkBuddyKeepSpots(next);
      placeNameMarkBuddy(buddy, false, [nmb.x, nmb.y]);
    } });
  }
  //: **Tuck it away for a while** (the owner at release: "a way to tuck it
  //: away but still have it there"): it goes behind the status bar with
  //: only its head showing, the bar perch's own `legs: "peek"`, and stays
  //: there, on this page only and not saved, until it is clicked, dragged
  //: or called back.
  const { bottom } = nameMarkBuddyLedges();
  if (bottom && !nmb.tucked) {
    items.push({ group: "place", label: "ph:arrow-line-down Tuck behind the bar", run: () => {
      const x = Math.max(NMB_GUTTER, Math.min(innerWidth - NMB_GUTTER - NMB_W, Math.round(buddy.getBoundingClientRect().left)));
      nmb.tucked = true;
      nameMarkBuddyMoveTo(buddy, { kind: "pinned", pose: "sit", legs: "peek", x, y: bottom.top - NMB_SEAT, edge: { el: document.getElementById("status-bar"), type: "top", kind: "bar", y: bottom.top } });
    } });
  }
  items.push({ group: "place", label: "ph:arrow-counter-clockwise Call back and reset its place", run: nameMarkBuddyCallBack });
  //: **Who it is, how Atlas looks, its size, and the settings behind them,
  //: one flyout each** (the owner: "extend this menu a bit maybe with
  //: sub-sections if necessary, for things such as a quick link to the
  //: profile/personas/appearences tab, toggling various features such as
  //: masculine/feminine, which companion is displayed etc."). Submenus
  //: (`items`, the kebab recipe's flyout) so the menu stays eight rows; the
  //: current choice in each is ticked. Each choice goes through its own
  //: Appearance control's change, so the menu and Settings cannot disagree.
  const tick = (on, label) => `${on ? "ph:check" : "ph:dot-outline"} ${label}`;
  const choose = (id, value) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };
  let who = "off";
  try {
    who = prefs.get("avatar-buddy", null) || "off";
  } catch (e) {
    who = "off";
  }
  items.push({
    group: "who",
    label: "ph:user-switch Companion",
    items: [
      ...[["atlas", "Atlas"], ["me", "You"], ["persona", "The chat's persona"], ["custom", "Your own character"]]
        .map(([value, label]) => ({
          label: tick(who === value, label),
          //: Your own character, never made: chosen, and its maker opened,
          //: rather than a face quietly made up for it.
          run: () => {
            choose("avatar-buddy", value);
            if (value === "custom" && !nameMarkBuddyMade("custom")) nameMarkBuddyMakeIt("custom");
          },
        })),
      ...(nameMarkBuddyMade("me") ? [] : [{ label: "ph:user-circle-plus Create your avatar", run: () => nameMarkBuddyMakeIt("me") }]),
    ],
  });
  const look = document.getElementById("atlas-look")?.value || "auto";
  items.push({
    group: "who",
    label: "ph:coat-hanger Atlas look",
    items: [["masculine", "Masculine"], ["feminine", "Feminine"], ["auto", "Auto: match your faces"]]
      .map(([value, label]) => ({ label: tick(look === value, label), run: () => choose("atlas-look", value) })),
  });
  const size = nmb.scale || 1;
  items.push({
    group: "who",
    label: "ph:resize Size",
    items: Object.entries(NMB_SIZES).map(([name, value]) => ({
      label: tick(size === value, `${name[0].toUpperCase()}${name.slice(1)}`),
      title: `Make it ${name}`,
      run: () => nameMarkBuddySetSize(value),
    })),
  });
  items.push({
    group: "settings",
    label: "ph:gear Settings",
    items: [
      { label: "ph:palette Appearance, the companion", run: () => openSettingsModal("appearance", "avatar-buddy-row") },
      { label: "ph:user-circle Profile, your look", run: () => openSettingsModal("preferences") },
      { label: "ph:mask-happy Personas", run: () => openSettingsModal("personas") },
    ],
  });
  items.push({ group: "hide", label: "ph:eye-slash Hide", run: () => nameMarkBuddyHide(buddy) });
  const box = face.getBoundingClientRect();
  //: In the enlarged view (`nmb.visit`) only who it is, its look and its
  //: size: a place on the page, Enlarge and Hide mean nothing inside the card.
  const shown = nmb.visit ? items.filter((item) => item.group === "who") : items;
  openMenuAtPoint(shown, "Companion", at ? at[0] : box.left, at ? at[1] : box.top);
  const menu = [...document.querySelectorAll(".pointer-menu-host .action-menu, .action-menu.action-menu-escaped")]
    .find((el) => !el.classList.contains("hidden") && el.getBoundingClientRect().width);
  nmb.menu = menu || null;
  if (!menu) return;
  //: At the pointer: only kept inside the window.
  const inside = () => {
    menu.style.translate = "";
    const now = menu.getBoundingClientRect();
    const margin = 8;
    const dx = Math.min(0, innerWidth - margin - now.right) + Math.max(0, margin - now.left);
    const dy = Math.min(0, innerHeight - margin - now.bottom) + Math.max(0, margin - now.top);
    if (dx || dy) menu.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`;
  };
  //: Placed from the companion's box as it is each time: a panel moving
  //: under it while the menu is open (a transform) carries both.
  const beside = () => {
    const box = face.getBoundingClientRect();
    menu.style.translate = "";
    const now = menu.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    let left = box.right + gap;
    if (left + now.width > innerWidth - margin) left = box.left - gap - now.width;
    left = Math.min(Math.max(margin, left), innerWidth - margin - now.width);
    const top = Math.min(Math.max(margin, box.top), innerHeight - margin - now.height);
    menu.style.translate = `${Math.round(left - now.left)}px ${Math.round(top - now.top)}px`;
  };
  //: Placed now, and once more on the next frame: the menu's own opening
  //: settles its box a frame later, which measured as the menu landing 13px
  //: above the companion's top when placed only once.
  const place = at ? inside : beside;
  place();
  nmb.menuPlace = place;
  requestAnimationFrame(() => {
    if (menu.isConnected && !menu.classList.contains("hidden")) place();
  });
}
