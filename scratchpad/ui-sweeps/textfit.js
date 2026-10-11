// The text-fit check, as a page expression for `page.evaluate` (errors.js,
// fontmatrix.js, and any sweep that opens a surface errors.js does not):
// every text run that passes its own box's padding edge with nothing
// handling it (no ellipsis between, no scroller), or that a clipping box cuts
// without an ellipsis. Returns up to 16 "box > host +Npx "words"" lines.
module.exports = `(()=>{
  const vis=e=>e.checkVisibility&&e.checkVisibility({visibilityProperty:true,opacityProperty:true,contentVisibilityAuto:true});
  const roots=[...document.querySelectorAll('.tab-page:not(.hidden), .action-menu:not(.hidden), #settings-modal:not(.hidden) .settings-section:not(.hidden), #top-bar, #status-bar, .sheet-overlay:not(.hidden), dialog[open]')];
  const skip='input, textarea, select, option, script, style, svg, canvas, pre, code, kbd, [contenteditable="true"], [contenteditable="true"] *, .cm-editor, .sr-only, .visually-hidden, [aria-hidden="true"]';
  const out=new Map();
  const sig=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList.length?'.'+[...e.classList].slice(0,2).join('.'):'');
  for(const root of roots){
    const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    for(let n=walk.nextNode();n;n=walk.nextNode()){
      if(!n.textContent.trim())continue;
      const host=n.parentElement; if(!host||host.closest(skip)||!vis(host))continue;
      let box=host; while(box&&/^(inline|contents)$/.test(getComputedStyle(box).display))box=box.parentElement;
      if(!box||box.clientWidth<8)continue;
      const range=document.createRange(); range.selectNodeContents(n); const rects=[...range.getClientRects()]; if(!rects.length)continue;
      const right=Math.max(...rects.map(r=>r.right)), left=Math.min(...rects.map(r=>r.left));
      const cs=getComputedStyle(box), br=box.getBoundingClientRect();
      const inner=br.left+parseFloat(cs.borderLeftWidth)+box.clientWidth-parseFloat(cs.paddingRight);
      const innerL=br.left+parseFloat(cs.borderLeftWidth)+parseFloat(cs.paddingLeft);
      if(right<=inner+1&&left>=innerL-1)continue;
      //: Handled: a scroller, or a box that clips with an ellipsis between it and the text
      //: (the box itself counts: its ellipsis is drawn inside its own padding).
      let handled=false;
      for(let p=host;p&&p!==box.parentElement;p=p.parentElement){const c=getComputedStyle(p);if(/auto|scroll/.test(c.overflowX)){handled=true;break;} if(/hidden|clip/.test(c.overflowX)&&c.textOverflow==='ellipsis'&&(p===box||p.getBoundingClientRect().right<=inner+1)){handled=true;break;}}
      if(handled)continue;
      //: A box that is itself off its parent's edge is errors.js's other finding, not this one.
      const key=sig(box)+' > '+sig(host);
      if(!out.has(key))out.set(key,key+' +'+Math.round(Math.max(right-inner,innerL-left))+'px "'+n.textContent.trim().slice(0,40)+'"');
    }
  }
  return [...out.values()].slice(0,16);
})()`;
