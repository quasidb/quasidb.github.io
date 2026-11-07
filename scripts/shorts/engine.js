// QDB Shorts engine: drives a game page in a vertical phone-sized browser and
// captures it frame by frame into a 1080x1920 MP4.
//
// Why frame by frame: the page runs on a fake clock (Playwright's page.clock) and
// CSS animations are paused and stepped by hand, so every frame is rendered at
// full resolution and the video plays smoothly however slow the machine is.
'use strict';
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT_W = 1080, OUT_H = 1920;
const VIEW_W = 450, VIEW_H = 800;          // CSS pixels, a typical phone
const SCALE = OUT_W / VIEW_W;              // 2.4 -> 1080x1920 device pixels
const TOP = 100;                           // caption band height: content is framed below it
const BLOCK = /gc\.zgo\.at|goatcounter\.com|google-analytics|googletagmanager/;

const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Injected into every page before its own scripts run.
const INIT = `(() => {
  // Same "random" choices on every run, so a recording is repeatable.
  let seed = 20260105;
  Math.random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // Smooth scrolling that runs on the (fake) animation clock, so it shows up in frames.
  const rawScrollTo = window.scrollTo.bind(window);
  let anim = null;
  function glide(top) {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    top = Math.max(0, Math.min(max, top));
    const from = scrollY, t0 = performance.now(), dur = Math.min(700, 250 + Math.abs(top - from) * 0.6);
    if (anim) cancelAnimationFrame(anim);
    if (Math.abs(top - from) < 2) { rawScrollTo(0, top); return; }
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      rawScrollTo(0, from + (top - from) * e);
      anim = k < 1 ? requestAnimationFrame(step) : null;
    };
    anim = requestAnimationFrame(step);
  }
  window.__qdbRawScrollTo = rawScrollTo;
  window.__qdbGlide = glide;
  // The recorder is the camera: the game's own scroll calls are ignored so each
  // scenario decides what is in shot.
  window.scrollTo = function () {};
  Element.prototype.scrollIntoView = function () {};
  // Step CSS animations/transitions by the fake clock instead of real time.
  const starts = new WeakMap();
  window.__qdbSyncAnims = () => {
    const now = performance.now();
    for (const a of document.getAnimations()) {
      if (!starts.has(a)) { starts.set(a, now - (a.currentTime || 0)); a.pause(); }
      try { a.currentTime = (now - starts.get(a)) * (a.playbackRate || 1); } catch (e) {}
    }
  };
  // Overlay layer: fake finger, captions, intro and outro cards.
  const CSS = \`
    html{scrollbar-width:none;scroll-behavior:auto!important}::-webkit-scrollbar{display:none}
    .qdbg{display:none!important}
    #qdbx{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:"Space Grotesk",system-ui,sans-serif}
    #qdbx .finger{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;
      background:rgba(255,255,255,.85);border:3px solid rgba(15,23,42,.55);box-shadow:0 4px 14px rgba(0,0,0,.45);opacity:0}
    #qdbx .ripple{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #f5b83d;opacity:0}
    #qdbx .cap{position:absolute;left:18px;right:18px;top:8px;padding:12px 16px;border-radius:16px;background:rgba(9,13,22,.92);
      border:2px solid #f5b83d;color:#fff;font-weight:700;font-size:22px;line-height:1.25;text-align:center;opacity:0;
      box-shadow:0 10px 30px rgba(0,0,0,.5)}
    #qdbx .cap b{color:#f5b83d}
    #qdbx .card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
      padding:40px 30px;text-align:center;background:radial-gradient(circle at 50% 35%,rgba(30,41,66,.97),rgba(6,9,16,.98));color:#fff;opacity:0}
    #qdbx .card .k{font:700 15px/1 "JetBrains Mono",monospace;letter-spacing:.14em;color:#22c55e}
    #qdbx .card h1{font-size:46px;line-height:1.05;margin:0;letter-spacing:-.02em}
    #qdbx .card h1 em{font-style:normal;color:#f5b83d}
    #qdbx .card p{font-size:24px;line-height:1.3;margin:0;color:#cbd5e1;max-width:380px}
    #qdbx .card .url{font:700 21px/1.2 "JetBrains Mono",monospace;color:#0b0f17;background:#f5b83d;padding:14px 18px;border-radius:14px}
    #qdbx .card .small{font-size:16px;color:#94a3b8}
  \`;
  function mount() {
    if (document.getElementById('qdbx')) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const x = document.createElement('div'); x.id = 'qdbx';
    x.innerHTML = '<div class="card" id="qdbx-card"></div><div class="cap" id="qdbx-cap"></div><div class="ripple" id="qdbx-rip"></div><div class="finger" id="qdbx-fin"></div>';
    document.body.appendChild(x);
  }
  window.__qdbFx = (s) => {
    mount(); window.__qdbSyncAnims();
    const f = document.getElementById('qdbx-fin'), r = document.getElementById('qdbx-rip');
    f.style.left = s.fx + 'px'; f.style.top = s.fy + 'px'; f.style.opacity = s.fo;
    f.style.transform = 'scale(' + (s.press ? .8 : 1) + ')';
    r.style.left = s.fx + 'px'; r.style.top = s.fy + 'px'; r.style.opacity = s.ro; r.style.transform = 'scale(' + s.rs + ')';
    const c = document.getElementById('qdbx-cap');
    if (c.dataset.h !== s.cap) { c.innerHTML = s.cap; c.dataset.h = s.cap; }
    c.style.opacity = s.co; c.style.transform = 'translateY(' + (1 - s.co) * -12 + 'px)';
    if (s.capTop != null) c.style.top = s.capTop + 'px';
    const d = document.getElementById('qdbx-card');
    if (d.dataset.h !== s.card) { d.innerHTML = s.card; d.dataset.h = s.card; }
    d.style.opacity = s.ko;
  };
})();`;

class Director {
  constructor(opts) {
    this.fps = opts.fps || 30;
    this.out = opts.out;
    this.base = opts.base.replace(/\/$/, '');
    this.maxSeconds = opts.maxSeconds || 58;
    this.music = opts.music || null;
    this.preview = !!opts.preview;  // draft mode: lower fps/quality for quick checks
    this.frames = 0;
    this.fx = { fx: VIEW_W / 2, fy: VIEW_H * 0.7, fo: 0, press: false, ro: 0, rs: 1, cap: '', co: 0, capTop: null, card: '', ko: 0 };
    this.tasks = [];   // per-frame tweens: fn(frameIndex) -> true when finished
  }

  async open(urlPath) {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext({
      viewport: { width: VIEW_W, height: VIEW_H }, deviceScaleFactor: SCALE,
      reducedMotion: 'no-preference', colorScheme: 'dark', locale: 'en-GB',
    });
    await this.context.route('**/*', r => (BLOCK.test(r.request().url()) ? r.abort() : r.continue()));
    this.page = await this.context.newPage();
    await this.page.addInitScript(INIT);
    await this.page.clock.install({ time: new Date('2026-01-05T09:00:00Z') });
    await this.page.goto(this.base + urlPath, { waitUntil: 'load' });
    await this.page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await this.page.evaluate(() => document.fonts && document.fonts.ready);
    await this.page.clock.pauseAt(new Date('2026-01-05T09:00:10Z'));
    await this.startEncoder();
  }

  startEncoder() {
    fs.mkdirSync(path.dirname(this.out), { recursive: true });
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(this.fps), '-c:v', 'mjpeg', '-i', '-'];
    if (this.music) args.push('-stream_loop', '-1', '-i', this.music);
    else args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
    args.push('-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', this.preview ? 'veryfast' : 'slow',
      '-crf', this.preview ? '26' : '17', '-pix_fmt', 'yuv420p', '-r', String(this.fps),
      '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart');
    if (this.music) args.push('-af', 'volume=0.35');
    args.push(this.out);
    this.ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    this.ffDone = new Promise((res, rej) => this.ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  }

  get seconds() { return this.frames / this.fps; }

  // Advance the page clock by one frame, run tweens, capture.
  async frame() {
    const ms = 1000 / this.fps, target = Math.round((this.frames + 1) * ms) - Math.round(this.frames * ms);
    await this.page.clock.runFor(target);
    this.tasks = this.tasks.filter(t => !t(this.frames));
    await this.page.evaluate(s => window.__qdbFx(s), this.fx);
    const buf = await this.page.screenshot({ type: 'jpeg', quality: this.preview ? 80 : 95, scale: 'device', animations: 'allow', caret: 'hide' });
    if (!this.ff.stdin.write(buf)) await new Promise(r => this.ff.stdin.once('drain', r));
    this.frames++;
    if (this.seconds > this.maxSeconds + 5) throw new Error('Clip ran past ' + this.maxSeconds + 's: shorten the scenario.');
  }

  async wait(ms) { const n = Math.round(ms / 1000 * this.fps); for (let i = 0; i < n; i++) await this.frame(); }

  // Tween helper: animate fx[key] from current to `to` over ms.
  tween(key, to, ms) {
    const from = this.fx[key], n = Math.max(1, Math.round(ms / 1000 * this.fps)); let i = 0;
    this.tasks.push(() => { i++; this.fx[key] = from + (to - from) * ease(Math.min(1, i / n)); return i >= n; });
  }

  // ---- captions and cards -------------------------------------------------
  async caption(html, { hold = 2600, top = null, keep = false } = {}) {
    this.fx.cap = html; this.fx.capTop = top == null ? 8 : top; this.tween('co', 1, 250);
    await this.wait(hold);
    if (!keep) { this.tween('co', 0, 250); await this.wait(260); }
  }
  hideCaption() { this.tween('co', 0, 250); }
  async card(html, { hold = 2500, fadeIn = 300, fadeOut = 350 } = {}) {
    this.fx.card = html; this.tween('ko', 1, fadeIn); await this.wait(hold);
    if (fadeOut) { this.tween('ko', 0, fadeOut); await this.wait(fadeOut + 20); }
  }

  // ---- finger -------------------------------------------------------------
  async moveFinger(x, y, ms = 450) {
    if (this.fx.fo < 0.5) { this.fx.fx = x + 60; this.fx.fy = y + 160; this.tween('fo', 1, 200); }
    this.tween('fx', x, ms); this.tween('fy', y, ms); await this.wait(ms + 40);
  }
  async ripple() {
    this.fx.press = true; this.fx.rs = 1; this.fx.ro = 1; this.tween('rs', 2.6, 380); this.tween('ro', 0, 380);
    await this.wait(120); this.fx.press = false;
  }
  hideFinger() { this.tween('fo', 0, 250); }

  // Glide the camera so the element's top sits `at` px from the top of the frame
  // (default: just under the caption band), or centre it with at: 'center'.
  async reveal(selector, { at = TOP, ms = 750 } = {}) {
    await this.page.locator(selector).first().evaluate((el, at) => {
      const r = el.getBoundingClientRect();
      window.__qdbGlide(scrollY + r.top - (at === 'center' ? (innerHeight - r.height) / 2 : at));
    }, at);
    await this.wait(ms);
  }
  async scrollTo(top, ms = 750) { await this.page.evaluate(t => window.__qdbGlide(t), top); await this.wait(ms); }

  async box(selector) {
    const el = this.page.locator(selector).first();
    await el.waitFor({ state: 'attached', timeout: 5000 });
    let b = await el.boundingBox();
    if (!b || b.y < 70 || b.y + b.height > VIEW_H - 90) { await this.reveal(selector, { at: 'center' }); b = await el.boundingBox(); }
    if (!b) throw new Error('Not visible: ' + selector);
    return b;
  }

  // Show the finger tapping an element, then click it for real.
  async tap(selector, { pause = 250, after = 500 } = {}) {
    const b = await this.box(selector), x = b.x + b.width / 2, y = b.y + b.height / 2;
    await this.moveFinger(x, y);
    await this.wait(pause);
    await this.ripple();
    await this.page.mouse.click(x, y);
    await this.wait(after);
  }

  // Drag with the finger from (x1,y1) to (x2,y2) in viewport pixels.
  async drag(x1, y1, x2, y2, ms = 900) {
    await this.moveFinger(x1, y1);
    await this.ripple();
    await this.page.mouse.move(x1, y1); await this.page.mouse.down();
    const n = Math.max(2, Math.round(ms / 1000 * this.fps));
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n), x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k;
      this.fx.fx = x; this.fx.fy = y; this.fx.press = true;
      await this.page.mouse.move(x, y);
      await this.frame();
    }
    await this.page.mouse.up(); this.fx.press = false;
    await this.wait(250);
  }

  async run(fn) { return this.page.evaluate(fn); }

  async close() {
    this.ff.stdin.end();
    await this.ffDone;
    await this.browser.close();
  }
}

// Shared intro/outro cards.
function introCard(kick, titleHtml, hook) {
  return `<div class="k">${kick}</div><h1>${titleHtml}</h1><p>${hook}</p>`;
}
function outroCard(name, slug, line) {
  return `<div class="k">FREE · NO SIGN-UP · 5 MINUTES</div><h1>Play <em>${name}</em></h1>` +
    `<p>${line}</p><div class="url">quasidb.com/games</div><div class="small">Link in the description</div>`;
}

module.exports = { Director, introCard, outroCard, VIEW_W, VIEW_H };
