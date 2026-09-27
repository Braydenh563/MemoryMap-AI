// Reported (INBOX 430, from the coordinator): "there keeps being scroll
// jump on various pages like the chat conversations (I have a sources
// dropdown open if that is any help)".
//
// **Not reproduced as of this writing.** This sweep follows the reported
// repro exactly: open a chat with several real tool-using turns (so it has
// a Sources fold, per chatSourcesPanel), open that fold, scroll the
// transcript to the middle, then watch #chat-messages.scrollTop for 20s
// idle and again while a new turn streams. Run against a real backend
// (`bash scratchpad/ui-sweeps/serve.sh <port> <dir>`) with a fake OpenAI
// server for the model (`python3 scratchpad/fake_openai_server.py --port
// 8799`, then POST /models/provider {"provider":"openai","base_url":
// "http://127.0.0.1:8799/v1"}) so the turns actually stream instead of
// erroring offline.
//
// **The gap this sweep cannot close on its own**: fake_openai_server.py
// answers close to instantly (no artificial per-chunk delay flag), so a
// run against it never sustains more than a few hundred ms of real
// overlap between "the reader is scrolled away, mid-turn" and "the stream
// is still writing". A genuinely slow model exposes a wider window;
// CLAUDE.md section 4's `scratchpad/llama-dev.sh serve` is the way to get
// one for a real run of this sweep (`pytest -m evals`-style, but this is a
// browser sweep, not a pytest marker: run it by hand with
// MEMORYMAP_EVALS_URL/MODEL pointed at the llama.cpp server instead of the
// fake one, same POST /models/provider shape).
//
// What was tried and came back clean, all against the fake server:
//   - the prescribed method above verbatim: 20s idle + 8s of a real
//     streaming turn, both starting scrolled to the pane's middle with a
//     Sources fold open: 0px of scrollTop drift in either window.
//   - a real mouse-wheel scroll mid-turn (not a programmatic scrollTop
//     assignment): the pane followed the wheel and stayed there, keepAtBottom
//     never snapped it back.
//   - opening/closing every Sources fold currently scrolled *above* the
//     visible viewport: Chrome's own scroll anchoring compensated
//     correctly (scrollTop moved to cancel the height change; the content
//     actually on screen did not move a pixel).
//   - a MutationObserver on <body> plus a scroll listener on #chat-messages,
//     idle for 25s with a fold open: only the expected background chatter
//     (data-stuck flips, the status-bar clock ticking, the jump-to-latest
//     pill's own attributes) and zero scrollTop deltas over 3px.
//
// Kept as a sweep, not deleted, because a non-repro against an
// instantaneous fake model is not a clean bill of health for a bug this
// specific: exit code 0 here means "still not reproduced under these
// conditions", not "fixed". `--full` in scripts/gate.sh does not run this
// (browser sweeps never are); run it by hand, per CLAUDE.md's own note
// that a report which keeps coming back while the code tests clean is
// worth reproducing again before touching anything.
const { boot } = require('./lib.js');

async function sampleScrollTop(page, seconds) {
  const readings = [];
  const n = Math.round(seconds * 1000 / 200);
  for (let i = 0; i < n; i++) {
    const t = await page.evaluate(() => {
      const pane = document.getElementById('chat-messages');
      return pane ? pane.scrollTop : null;
    });
    readings.push(t);
    await page.waitForTimeout(200);
  }
  return readings;
}

function jumped(readings, slackPx = 5) {
  const base = readings.find((v) => v !== null);
  if (base === undefined) return false;
  return readings.some((v) => v !== null && Math.abs(v - base) > slackPx);
}

(async () => {
  const { browser, page } = await boot();

  const providerResp = await page.evaluate(async () => {
    return await apiJson('/models/provider', {
      method: 'POST',
      body: JSON.stringify({ provider: 'openai', base_url: 'http://127.0.0.1:8799/v1' }),
    }).catch((e) => ({ error: String(e) }));
  });
  if (providerResp.error || providerResp.reachable === false) {
    console.log('SKIP: fake_openai_server.py not reachable on :8799 (' + JSON.stringify(providerResp) + '). Start it first: python3 scratchpad/fake_openai_server.py --port 8799');
    await browser.close();
    return;
  }

  await page.evaluate(() => window.switchTab && window.switchTab('chat'));
  await page.waitForTimeout(600);

  // Ask enough questions to get a real, scrollable, multi-turn transcript
  // with at least one Sources fold (each turn makes one tool call per
  // fake_openai_server.py's own script, which is what chatSourcesPanel
  // needs to draw one).
  for (const q of ['What tags do I have?', 'Search my notes for sourdough.', 'What have I written lately?']) {
    await page.fill('#chat-input', q);
    await page.click('#chat-send');
    await page.waitForSelector('#chat-send:not(.hidden)', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  const opened = await page.evaluate(() => {
    const details = [...document.querySelectorAll('#chat-messages details')].find((d) =>
      d.querySelector('summary')?.textContent?.includes('Sources'));
    if (!details) return false;
    details.open = true;
    return true;
  });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const pane = document.getElementById('chat-messages');
    pane.scrollTop = Math.round((pane.scrollHeight - pane.clientHeight) / 2);
  });
  await page.waitForTimeout(200);
  const midStart = await page.evaluate(() => document.getElementById('chat-messages').scrollTop);

  const idle = await sampleScrollTop(page, 20);

  await page.evaluate(() => {
    const pane = document.getElementById('chat-messages');
    pane.scrollTop = Math.round((pane.scrollHeight - pane.clientHeight) / 2);
  });
  await page.waitForTimeout(150);
  await page.fill('#chat-input', 'One more, while I keep reading.');
  await page.click('#chat-send');
  const streaming = await sampleScrollTop(page, 8);

  const result = {
    sourcesFoldOpened: opened,
    midStart,
    idleJumped: jumped(idle),
    idleMin: Math.min(...idle.filter((v) => v !== null)),
    idleMax: Math.max(...idle.filter((v) => v !== null)),
    streamingJumped: jumped(streaming),
    streamingMin: Math.min(...streaming.filter((v) => v !== null)),
    streamingMax: Math.max(...streaming.filter((v) => v !== null)),
  };
  console.log(JSON.stringify(result, null, 2));
  console.log(result.idleJumped || result.streamingJumped ? 'JUMP DETECTED' : 'no jump detected');

  await browser.close();
})();
