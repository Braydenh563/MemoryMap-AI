// The web clipper's bookmark in Settings, Import & export (WORLD_CLASS_PLAN
// D9, row 24). Loaded when that section opens (settings.js).
//
// The bookmark is a `javascript:` address the person drags to their
// bookmarks bar. It is written here, at runtime, with this app's own
// address in it, because the app may be on any port and the bookmark has to
// find it from another site. Pressing it on a page opens clip.html (clip.js)
// on that address with the page's address, title and selection in the
// fragment, then answers clip.html's "ready" with the page's HTML.
//
// Pressing the link inside the app does nothing but say what it is for: the
// app's own CSP refuses `javascript:` addresses, which is right, and the
// click handler turns that silence into a sentence.

function webClipBookmarklet(origin) {
  const o = JSON.stringify(origin);
  const code =
    "(function(){" +
    `var o=${o},s=String(getSelection()||'').slice(0,200000),` +
    "d={u:location.href,t:document.title,s:s.slice(0,4000)}," +
    "w=window.open(o+'/clip.html#'+encodeURIComponent(JSON.stringify(d)),'memorymap-clip','width=560,height=520');" +
    "if(!w)return;" +
    "function f(e){if(e.origin!==o||e.source!==w||e.data!=='memorymap-clip-ready')return;" +
    "removeEventListener('message',f);" +
    "w.postMessage({type:'memorymap-clip',url:location.href,title:document.title," +
    "html:document.documentElement.outerHTML.slice(0,3000000),selection:s},o)}" +
    "addEventListener('message',f)})()";
  return `javascript:${code}`;
}

function renderWebClip() {
  const link = $("web-clip-bookmarklet");
  if (!link) return;
  link.setAttribute("href", webClipBookmarklet(location.origin));
}

$("web-clip-bookmarklet")?.addEventListener("click", (event) => {
  event.preventDefault();
  $("web-clip-status").textContent = "Drag it to your bookmarks bar, then press it on the page you want to keep.";
});

$("web-clip-copy")?.addEventListener("click", async () => {
  //: Through the shared helper, which falls back where the clipboard API
  //: is not allowed (tests/test_log_console.py).
  $("web-clip-status").textContent = (await copyToClipboard(webClipBookmarklet(location.origin)))
    ? "Copied. Make a new bookmark and paste this as its address."
    : "Couldn't copy here. Drag the bookmark to your bookmarks bar instead.";
});

renderWebClip();

//: **The web panel's reader** (moved from chat.js for the boot scripts' gzip
//: ratchet; chat.js's `openWebReader` loads this file and calls it).
async function showWebReader(url) {
  const status = $("web-status");
  status.classList.remove("error");
  status.textContent = "Opening…";
  const controller = webRequestStart();
  let page;
  try {
    page = await apiJson(`/websearch/read?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") return;
    if (!webRequestEnd(controller)) return;
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  if (!webRequestEnd(controller)) return;
  webReaderPage = page;
  readerBookmarkMark(false);
  status.textContent = "";
  $("web-reader-title").textContent = page.title || page.domain;
  const length = page.read_minutes
    ? ` · ${page.words.toLocaleString()} words, about ${page.read_minutes} min`
    : "";
  $("web-reader-source").textContent = `${page.domain}${length}`;
  $("web-reader-source").title = page.url;

  // Lay the page out as headings, paragraphs and lists rather than one wall
  // of text. Built with createElement/textContent: never innerHTML, since
  // the page is untrusted by definition.
  const box = $("web-reader-text");
  box.replaceChildren();
  const blocks = page.blocks && page.blocks.length ? page.blocks : null;
  if (!blocks) {
    const fallback = document.createElement("p");
    fallback.textContent = page.text || "(Nothing readable on that page.)";
    box.appendChild(fallback);
  } else {
    let list = null;
    for (const block of blocks) {
      if (block.type === "li") {
        if (!list) {
          list = document.createElement("ul");
          box.appendChild(list);
        }
        const li = document.createElement("li");
        li.textContent = block.text;
        list.appendChild(li);
        continue;
      }
      list = null;
      // Headings keep the page's own depth. Rendering every h1..h6 as one
      // size threw away the outline, which is what tells you where you are
      // in a long article.
      const tag =
        block.type === "heading"
          ? `h${Math.min(6, Math.max(3, (block.level || 2) + 1))}`
          : block.type === "pre"
            ? "pre"
            : block.type === "blockquote"
              ? "blockquote"
              : "p";
      const el = document.createElement(tag);
      if (block.type === "heading") el.className = "reader-heading";
      el.textContent = block.text;
      box.appendChild(el);
    }
  }
  $("web-search-history").classList.add("hidden");
  $("web-reader").classList.remove("hidden");
  //: The reader is the pane's one scroller, so a new page starts at its top.
  $("web-reader").scrollTop = 0;
  $("web-reader-back").focus({ preventScroll: true });
}

//: The reader's Save as note (moved from chat.js with the reader: its button
//: is on screen only once `showWebReader` has drawn a page).
async function saveWebPageAsNote() {
  if (!webReaderPage) return;
  // Prefer the structured read, it drops the nav/cookie chrome.
  const readable = webPageMarkdown(webReaderPage);
  const excerpt = (readable || webReaderPage.text || "").slice(0, 1200);
  const content = `${webReaderPage.title}\n${webReaderPage.url}\n\n${excerpt}`;
  try {
    await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, tags: ["web"] }),
    });
    toast("Saved as a note.");
    loadEntries().catch(() => {});
  } catch (error) {
    toast(error.message, true);
  }
}

//: **The reader's bookmark says when the page is kept** (the owner,
//: 2026-10-10: "I saved a website as a bookmark but the icon didnt change").
//: Pressed, the button takes the toggle's own `active` state and its title
//: says so; a new page starts unpressed (the bookmarks API has no lookup by
//: address, so a page kept before is said by the toast, "Already in your
//: bookmarks", when it is pressed again).
async function readerBookmark() {
  const page = webReaderPage;
  if (!page) return;
  const kept = await bookmarkWebResult({
    url: page.url,
    title: page.title || page.domain || "",
    snippet: (page.text || "").slice(0, 200),
  });
  if (kept && webReaderPage === page) readerBookmarkMark(true);
}

function readerBookmarkMark(kept) {
  const button = $("web-reader-bookmark");
  button.classList.toggle("active", kept);
  button.setAttribute("aria-pressed", String(kept));
  button.title = kept ? "In your bookmarks" : "Keep this link in your bookmarks";
}

//: **A follow-up about the page the last turn read** (the owner, 2026-10-10:
//: "I tried to ask for more info from the retrieved website in the previous
//: prompt and it just straight up ignored me"). A turn keeps only its
//: question and answer for the next one, so the page's text was gone: the
//: model saw "tell me more about it" and its own two-line summary. When the
//: new question points back at the page (this site, that article, more
//: about it), the page is read again, the reader's own route, and joins the
//: question as a cited page does (`webPageContextBlock`). Anything else, a
//: new subject, goes as it is.
const WEB_FOLLOW_UP = /\b(?:this|that|the|same)\s+(?:web\s*)?(?:site|page|article|link|post|source|wiki(?:pedia)?(?: page)?)\b|\b(?:more|further)\s+(?:info|information|detail|details)\b|\b(?:from|on|in|about)\s+(?:it|there|that)\b|\b(?:tell|say)\s+me\s+more\b|\bwhat\s+else\b/i;

function webFollowUpRefers(text) {
  return WEB_FOLLOW_UP.test(String(text || ""));
}

async function webFollowUp(text, url) {
  if (!url || !webFollowUpRefers(text)) return null;
  try {
    const page = await apiJson(`/websearch/read?url=${encodeURIComponent(url)}`);
    const body = (webPageMarkdown(page) || page.text || "").slice(0, WEB_CITE_CHARS);
    return body ? { title: page.title || page.domain || url, url: page.url || url, text: body } : null;
  } catch {
    //: The page cannot be read again (offline, gone): the question still goes.
    return null;
  }
}
