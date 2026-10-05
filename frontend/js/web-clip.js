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
  try {
    await navigator.clipboard.writeText(webClipBookmarklet(location.origin));
    $("web-clip-status").textContent = "Copied. Make a new bookmark and paste this as its address.";
  } catch {
    $("web-clip-status").textContent = "Couldn't copy here. Drag the bookmark to your bookmarks bar instead.";
  }
});

renderWebClip();
