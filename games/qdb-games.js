/* QDB Games kit: share links + free weekly COT / Telegram links, shared by every game page.
   Usage on a game page:
     <script src="../qdb-games.js" data-game="crowd-express" data-title="Crowd Express"></script>
     QDBGames.mount(element, {text: "I scored 7/8 on Crowd Express"})   // result-specific panel
   The script also adds a footer panel to the bottom of the page automatically. */
(function () {
  var me = document.currentScript;
  var GAME = (me && me.dataset.game) || 'games';
  var TITLE = (me && me.dataset.title) || 'QDB Games';
  var SITE = 'https://quasidb.github.io/';
  var URL_ = SITE + 'games/' + (GAME === 'games' ? '' : GAME + '/');

  var GAMES = [
    { slug: 'stick-to-the-plan', name: 'Stick to the Plan', blurb: 'Ten trades, one year, real-life bills. Does following a written plan get you funded?' },
    { slug: 'retail-survival-simulator', name: 'Retail Survival Simulator', blurb: 'Survive real market crises: Lehman, the SNB floor, Brexit night and more.' },
    { slug: 'crowd-express', name: 'Crowd Express', blurb: 'Ride the retail sentiment train from Edinburgh to King’s Cross. Know when to board, and when it terminates.' },
    { slug: 'stop-hunter', name: 'Stop Hunter', blurb: 'Drag your stop and take profit, then watch the big fish hunt the crowd\u2019s stop loss clusters.' },
    { slug: 'order-book-walls', name: 'Order Book Walls', blurb: 'Read the crowd\u2019s orders and positions, and find the wall before price gets there.' },
    { slug: 'beat-the-crowd', name: 'Beat the Crowd (daily)', blurb: 'A new puzzle every weekday: five real pairs, where the crowd stood, and where price went next.' },
    { slug: 'advent', name: 'The Trader\u2019s Advent Calendar', blurb: 'One two-minute trading challenge behind each door, 1 to 24 December. Collect all 72 stars.' }
  ];

  function gc(name) { try { window.goatcounter && goatcounter.count && goatcounter.count({ path: name, title: name, event: true }); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function link(net) { return URL_ + '?ref=' + net; }

  var CSS = '' +
    '.qdbg{--qb:#0b0f17;--qp:#141b2b;--ql:#26324a;--qt:#e8edf6;--qm:#a3afc5;--qa:#f5b83d;--qg:#22c55e;' +
    'font-family:"Space Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--qt);background:var(--qp);border:1px solid var(--ql);' +
    'border-radius:18px;padding:22px;margin:22px auto;max-width:780px;text-align:left;line-height:1.5;box-sizing:border-box}' +
    '.qdbg *{box-sizing:border-box}' +
    '.qdbg h3{font-size:22px;margin:0 0 6px;color:var(--qt);font-family:inherit;letter-spacing:-.01em;line-height:1.2}' +
    '.qdbg p{margin:0 0 12px;color:var(--qm);font-size:16px}' +
    '.qdbg .qres{background:var(--qb);border:1px dashed var(--ql);border-radius:12px;padding:12px 14px;color:var(--qt);font-size:17px;margin:0 0 14px}' +
    '.qdbg .qshare{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px}' +
    '.qdbg .qshare a,.qdbg .qshare button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:9px 14px;border-radius:10px;border:1px solid var(--ql);' +
    'background:var(--qb);color:var(--qt);font-family:inherit;font-weight:600;font-size:15px;line-height:1;text-decoration:none;cursor:pointer}' +
    '.qdbg .qshare a:hover,.qdbg .qshare button:hover{border-color:var(--qa)}' +
    '.qdbg .qshare a.qcta{background:var(--qa);border-color:var(--qa);color:#1a1205}' +
    '.qdbg .qshare svg{width:18px;height:18px;flex:none;fill:currentColor}' +
    '.qdbg .qsep{height:1px;background:var(--ql);margin:18px 0}' +
    '.qdbg .qtag{display:inline-block;font:600 12px/1 ui-monospace,"JetBrains Mono",monospace;letter-spacing:.06em;color:var(--qg);background:rgba(34,197,94,.13);padding:5px 10px;border-radius:99px;margin-bottom:10px}' +
    '.qdbg form{display:flex;flex-wrap:wrap;gap:8px}' +
    '.qdbg input[type=email],.qdbg input[type=text]{flex:1 1 200px;min-height:46px;padding:10px 14px;border-radius:10px;border:1px solid var(--ql);background:var(--qb);color:var(--qt);font-family:inherit;font-size:16px}' +
    '.qdbg .qbtn{min-height:46px;padding:10px 18px;border-radius:10px;border:0;background:var(--qa);color:#1a1205;font-family:inherit;font-weight:700;font-size:16px;cursor:pointer}' +
    '.qdbg .qbtn[disabled]{opacity:.6}' +
    '.qdbg .qhp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.qdbg .qmsg{flex-basis:100%;font-size:15px;min-height:1em}.qdbg .qmsg.ok{color:var(--qg)}.qdbg .qmsg.err{color:#f87171}' +
    '.qdbg .qsmall{font-size:13px;color:var(--qm);margin:8px 0 0}' +
    '.qdbg .qmore{display:grid;gap:8px;margin-top:6px}' +
    '.qdbg .qmore a{display:block;padding:12px 14px;border-radius:12px;border:1px solid var(--ql);background:var(--qb);color:var(--qt);text-decoration:none}' +
    '.qdbg .qmore a:hover{border-color:var(--qa)}.qdbg .qmore b{display:block;font-size:17px}.qdbg .qmore span{font-size:14px;color:var(--qm)}' +
    '.qdbg .qhome{display:inline-block;margin-top:14px;color:var(--qa);font-weight:700;text-decoration:none}' +
    '.qdbg :focus-visible{outline:3px solid var(--qa);outline-offset:2px}';

  function addCSS() {
    if (document.getElementById('qdbg-css')) return;
    var s = document.createElement('style'); s.id = 'qdbg-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  var ICON = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.4 5.5-6.4zm-1.2 17.9h1.9L7.1 4.2H5.1l11.9 16z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V1.6L14 1.6c-4 0-4.9 3-4.9 4.9v2H6.8v4h2.3v10h4.9v-10h3.3l.4-4H14z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4v11H3v-11zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6v5.4h-4v-4.8c0-1.2 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5v4.9h-4v-11z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.2 18.7 19.3c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.1 1.8 11.6c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.2z"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12.1a2.2 2.2 0 0 0-3.7-1.6 10.7 10.7 0 0 0-5.7-1.8l1-4.5 3.1.7a1.6 1.6 0 1 0 .2-1l-3.5-.8c-.3 0-.5.1-.6.4l-1.1 5.2a10.8 10.8 0 0 0-5.8 1.8A2.2 2.2 0 1 0 3.5 14a4 4 0 0 0 0 .6c0 3.3 3.8 6 8.5 6s8.5-2.7 8.5-6v-.6c.9-.4 1.5-1.2 1.5-1.9zM7.5 13.6a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0zm8.9 4.2c-1.1 1.1-3.1 1.2-4.4 1.2s-3.3-.1-4.4-1.2a.4.4 0 0 1 .6-.6c.7.7 2.2 1 3.8 1s3.1-.3 3.8-1a.4.4 0 0 1 .6.6zm-.3-2.6a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.8-3.9a3 3 0 0 0 0-2.6l6.8-3.9A3 3 0 1 0 15 5l-6.8 3.9a3 3 0 1 0 0 6.2L15 19a3 3 0 1 0 3-3z"/></svg>'
  };

  function shareLinks(text) {
    var t = encodeURIComponent(text), tt = encodeURIComponent(text + ' ');
    return [
      ['x', 'X', 'https://twitter.com/intent/tweet?text=' + t + '&url=' + encodeURIComponent(link('x'))],
      ['facebook', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link('facebook'))],
      ['linkedin', 'LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(link('linkedin'))],
      ['whatsapp', 'WhatsApp', 'https://wa.me/?text=' + tt + encodeURIComponent(link('whatsapp'))],
      ['telegram', 'Telegram', 'https://t.me/share/url?url=' + encodeURIComponent(link('telegram')) + '&text=' + t],
      ['reddit', 'Reddit', 'https://www.reddit.com/submit?url=' + encodeURIComponent(link('reddit')) + '&title=' + t]
    ];
  }

  function panelHTML(opts) {
    var text = opts.text || ('Try ' + TITLE + ', a free trading game from QDB Trading Desk');
    var heading = opts.heading || (opts.text ? 'Share your result' : 'Enjoyed it? Share the game');
    var btns = shareLinks(text).map(function (s) {
      return '<a href="' + esc(s[2]) + '" target="_blank" rel="noopener noreferrer" data-net="' + s[0] + '">' + ICON[s[0]] + s[1] + '</a>';
    }).join('') +
      '<button type="button" data-copy>' + ICON.copy + '<span>Copy link</span></button>' +
      (navigator.share ? '<button type="button" data-native>' + ICON.more + 'More…</button>' : '');
    var others = GAMES.filter(function (g) { return g.slug !== GAME; }).map(function (g) {
      return '<a href="' + SITE + 'games/' + g.slug + '/?ref=' + GAME + '"><b>' + esc(g.name) + '</b><span>' + esc(g.blurb) + '</span></a>';
    }).join('');
    return '<h3>' + esc(heading) + '</h3>' +
      (opts.text ? '<div class="qres">' + esc(text) + '</div>' : '<p>Know a trader who would enjoy this? Send it their way.</p>') +
      '<div class="qshare">' + btns + '</div>' +
      '<div class="qsep"></div>' +
      '<span class="qtag">FREE · EVERY FRIDAY</span>' +
      '<h3>This week\u2019s COT report, in plain English</h3>' +
      '<p>What the big speculators hold in FX, Gold and Silver, updated every Friday. No sign-up needed.</p>' +
      '<div class="qshare"><a class="qcta" href="' + SITE + 'cot/?ref=game-' + esc(GAME) + '" data-go="cot">See the COT report</a>' +
      '<a href="https://t.me/quasidb" target="_blank" rel="noopener" data-go="telegram">' + ICON.telegram + 'Follow on Telegram</a></div>' +
      (others ? '<div class="qsep"></div><h3>More free games</h3><div class="qmore">' + others + '</div>' : '') +
      '<a class="qhome" href="' + SITE + '?ref=game-' + esc(GAME) + '">See the full QDB Sheet →</a>';
  }

  function wire(box, text) {
    box.querySelectorAll('[data-net]').forEach(function (a) {
      a.addEventListener('click', function () { gc('share-' + a.dataset.net + '-' + GAME); });
    });
    var cp = box.querySelector('[data-copy]');
    if (cp) cp.addEventListener('click', function () {
      var u = link('copy'), lab = cp.querySelector('span');
      var done = function () { lab.textContent = 'Link copied'; setTimeout(function () { lab.textContent = 'Copy link'; }, 2000); };
      try { navigator.clipboard.writeText(u).then(done, function () { window.prompt('Copy this link:', u); }); }
      catch (e) { window.prompt('Copy this link:', u); }
      gc('share-copy-' + GAME);
    });
    var nv = box.querySelector('[data-native]');
    if (nv) nv.addEventListener('click', function () {
      navigator.share({ title: TITLE, text: text, url: link('native') }).catch(function () {});
      gc('share-native-' + GAME);
    });
    box.querySelectorAll('[data-go]').forEach(function (a) {
      a.addEventListener('click', function () { gc('game-' + a.dataset.go + '-' + GAME); });
    });
  }

  function mount(el, opts) {
    opts = opts || {}; addCSS();
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return null;
    var box = document.createElement('section');
    box.className = 'qdbg'; box.setAttribute('aria-label', 'Share and more');
    box.innerHTML = panelHTML(opts);
    el.appendChild(box); wire(box, opts.text || ('Try ' + TITLE));
    if (opts.text && FOOT) FOOT.style.display = 'none';
    return box;
  }

  var FOOT = null;
  function footer() {
    if (document.body.dataset.qdbgFooter === 'off' || FOOT) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 16px 40px';
    document.body.appendChild(wrap);
    mount(wrap, {}); FOOT = wrap;
  }
  function showFooter() { if (FOOT) FOOT.style.display = ''; }

  window.QDBGames = { mount: mount, showFooter: showFooter, games: GAMES, url: URL_, track: gc };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', footer); else footer();
})();
