// INBOX 183, the first of its seven reports: "the context window badge at the
// top of the chat isnt centred".
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/chatbadge.js
//
// The badge is `#chat-context`, hidden until a turn reports its usage, so the
// meter is driven directly with a stats object rather than waiting for a model
// this sandbox does not have. Everything measured after that is the real
// element in the real header.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(500);

  const measure = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      renderChatContextMeter({ prompt_tokens: 5200, context_tokens: 8192, context_source: 'model' });
      // The other two chips of the subline, through their own renderers, so
      // the row is measured as a person with a conversation open sees it
      // rather than with two of its four chips missing.
      chatConv = { id: 1, title: 'Beans', turns: [{}, {}, {}] };
      renderChatTurnCount();
      renderChatUsage(5500);
      const model = document.getElementById('chat-active-model');
      if (model) { model.hidden = false; model.textContent = 'llama3.2:3b'; }
    });
    await page.waitForTimeout(200);
    return page.evaluate(() => {
      const pill = document.getElementById('chat-context');
      const line = pill.closest('.chat-subline');
      const model = document.getElementById('chat-active-model');
      const p = pill.getBoundingClientRect();
      const l = line.getBoundingClientRect();
      const cs = getComputedStyle(pill);
      // The other chips on the same line, so "off centre" can be told apart
      // from "this chip alone is off".
      const siblings = [...line.children]
        .filter((el) => !el.hidden && el.getBoundingClientRect().height)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.id || el.className, top: +r.top.toFixed(1), h: +r.height.toFixed(1), mid: +(r.top + r.height / 2).toFixed(1) };
        });
      // The horizontal half of the report: where the number sits inside the
      // pill's own border box. A Range over the contents measures the text
      // itself, which is the only way to see the separator dot the `::before`
      // used to put inside this box.
      const range = document.createRange();
      range.selectNodeContents(pill);
      const t = range.getBoundingClientRect();
      return {
        hidden: pill.hidden,
        text: pill.textContent,
        inset: { left: +(t.left - p.left).toFixed(1), right: +(p.right - t.right).toFixed(1) },
        offCentre: +((t.left + t.width / 2) - (p.left + p.width / 2)).toFixed(1),
        boxWidth: +p.width.toFixed(1),
        gapLeft: +(p.left - (pill.previousElementSibling
          ? pill.previousElementSibling.getBoundingClientRect().right : p.left)).toFixed(1),
        pill: { top: +p.top.toFixed(1), h: +p.height.toFixed(1), mid: +(p.top + p.height / 2).toFixed(1) },
        line: { top: +l.top.toFixed(1), h: +l.height.toFixed(1), mid: +(l.top + l.height / 2).toFixed(1) },
        modelH: model && !model.hidden ? +model.getBoundingClientRect().height.toFixed(1) : null,
        dot: (() => {
          const b = getComputedStyle(pill, '::before');
          return { content: b.content, position: b.position, width: b.width, textAlign: b.textAlign };
        })(),
        align: cs.alignItems,
        justify: cs.justifyContent,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        display: cs.display,
        siblings,
      };
    });
  };

  for (const width of [1440, 1280, 1024, 820, 390]) {
    const m = await measure(width);
    console.log(`  ${width}: ${JSON.stringify(m)}`);
    const drift = Math.abs(m.pill.mid - m.line.mid);
    check(`${width} badge centred on its line`, drift <= 1,
      `badge mid ${m.pill.mid}px, subline mid ${m.line.mid}px, drift ${drift.toFixed(1)}px, badge ${m.pill.h}px in a ${m.line.h}px line`);
    const mids = m.siblings.map((s) => s.mid);
    const spread = mids.length ? Math.max(...mids) - Math.min(...mids) : 0;
    check(`${width} separator still drawn, outside the pill`,
      m.dot.content === '"·"' && m.dot.position === 'absolute' && parseFloat(m.dot.width) > 0,
      `content ${m.dot.content}, ${m.dot.position}, ${m.dot.width} wide, ${m.dot.textAlign}`);
    check(`${width} number centred in its pill`, Math.abs(m.offCentre) <= 1,
      `text centre ${m.offCentre}px from the pill's box centre, insets ${m.inset.left}/${m.inset.right}px in a ${m.boxWidth}px pill, ${m.gapLeft}px of space to the chip before it`);
    check(`${width} every chip on one centre line`, spread <= 1,
      `${m.siblings.length} chips, centres spread ${spread.toFixed(1)}px: ${m.siblings.map((s) => `${s.id}@${s.mid}/${s.h}`).join(' ')}`);
  }

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
