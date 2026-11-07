#!/usr/bin/env node
// Record QDB games as vertical (1080x1920) YouTube Shorts.
//
//   node record.js                 record every game into ./out
//   node record.js stop-hunter     record one game
//   node record.js --list          list the games
//   options: --base <url>   play the live site instead of this checkout (e.g. https://quasidb.github.io)
//            --out <dir>    output folder (default ./out)
//            --music <file> background music, mixed quietly under the clip
//            --preview      quick low-quality draft
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Director } = require('./engine');

const GAMES = fs.readdirSync(path.join(__dirname, 'games')).filter(f => f.endsWith('.js')).map(f => require('./games/' + f));
const ROOT = path.resolve(__dirname, '..', '..');

function args() {
  const a = process.argv.slice(2), o = { games: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--base') o.base = a[++i];
    else if (a[i] === '--out') o.out = a[++i];
    else if (a[i] === '--music') o.music = path.resolve(a[++i]);
    else if (a[i] === '--preview') o.preview = true;
    else if (a[i] === '--list') o.list = true;
    else if (a[i] === 'all') o.games = GAMES.map(g => g.slug);
    else o.games.push(a[i]);
  }
  if (!o.games.length) o.games = GAMES.map(g => g.slug);
  return o;
}

// Tiny static server for the site checkout, so a branch can be recorded before it goes live.
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const o = args();
  if (o.list) { GAMES.forEach(g => console.log(g.slug.padEnd(28), g.name)); return; }
  const outDir = path.resolve(o.out || path.join(__dirname, 'out'));
  let srv = null, base = o.base;
  if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port; }
  let failed = 0;
  for (const slug of o.games) {
    const g = GAMES.find(x => x.slug === slug);
    if (!g) { console.error('Unknown game: ' + slug + ' (try --list)'); failed++; continue; }
    const file = path.join(outDir, g.slug + '.mp4'), t0 = Date.now();
    process.stdout.write(`Recording ${g.name}… `);
    const d = new Director({ base, out: file, music: o.music, preview: o.preview });
    try {
      await d.open(`/games/${g.slug}/`);
      await g.play(d);
      await d.close();
      fs.writeFileSync(path.join(outDir, g.slug + '.json'), JSON.stringify({ file: path.basename(file), ...g.meta }, null, 2));
      fs.writeFileSync(path.join(outDir, g.slug + '.txt'), `TITLE\n${g.meta.title}\n\nDESCRIPTION\n${g.meta.description}\n\nTAGS\n${g.meta.tags.join(', ')}\n`);
      console.log(`${d.seconds.toFixed(1)}s clip in ${Math.round((Date.now() - t0) / 1000)}s -> ${path.relative(process.cwd(), file)}`);
    } catch (e) {
      failed++; console.log('FAILED'); console.error(e);
      try { await d.browser.close(); } catch (_) {}
    }
  }
  if (srv) srv.close();
  process.exit(failed ? 1 : 0);
})();
