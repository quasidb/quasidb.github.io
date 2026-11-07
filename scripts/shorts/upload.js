#!/usr/bin/env node
// Upload a recorded clip to YouTube as a Short (YouTube Data API v3, no extra packages).
//
// One-time setup (see README.md):
//   node upload.js auth                      sign in once and print a refresh token
//
// Uploading:
//   node upload.js out/stop-hunter.mp4                       private upload (default)
//   node upload.js out/stop-hunter.mp4 --privacy unlisted
//   node upload.js out/stop-hunter.mp4 --privacy public      only when you have checked the clip
//   node upload.js out/stop-hunter.mp4 --publish-at 2026-11-14T17:00:00Z   private now, public at that time
//   node upload.js out/*.mp4 --dry-run                       show what would be sent, upload nothing
//
// Credentials come from environment variables (or a local .yt-credentials.json, never committed):
//   YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const LOCAL = path.join(__dirname, '.yt-credentials.json');

function creds() {
  let c = {};
  if (fs.existsSync(LOCAL)) c = JSON.parse(fs.readFileSync(LOCAL, 'utf8'));
  return {
    id: process.env.YT_CLIENT_ID || c.client_id,
    secret: process.env.YT_CLIENT_SECRET || c.client_secret,
    refresh: process.env.YT_REFRESH_TOKEN || c.refresh_token,
  };
}

async function token(c) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: c.refresh, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Could not refresh the YouTube token: ' + JSON.stringify(j) +
    (j.error === 'invalid_grant' ? '\nThe refresh token has expired or was revoked. Run `node upload.js auth` again (and check the OAuth app is "In production", not "Testing").' : ''));
  return j.access_token;
}

// One-time sign-in on your own computer: opens a local page that Google redirects back to.
async function auth() {
  const c = creds();
  if (!c.id || !c.secret) {
    console.error('Set YT_CLIENT_ID and YT_CLIENT_SECRET first (from your Google Cloud "Desktop app" OAuth client).');
    process.exit(1);
  }
  const srv = http.createServer();
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const redirect = `http://127.0.0.1:${srv.address().port}`;
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: c.id, redirect_uri: redirect, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent',
  });
  console.log('\nOpen this link in your browser and sign in with the account that owns the YouTube channel:\n\n' + url + '\n');
  const code = await new Promise((resolve, reject) => srv.on('request', (req, res) => {
    const q = new URL(req.url, redirect).searchParams;
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(q.get('code') ? '<h2>Done. You can close this tab and go back to the terminal.</h2>' : '<h2>Sign-in failed: ' + (q.get('error') || 'no code') + '</h2>');
    q.get('code') ? resolve(q.get('code')) : reject(new Error(q.get('error') || 'no code'));
  }));
  srv.close();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.id, client_secret: c.secret, redirect_uri: redirect, grant_type: 'authorization_code' }),
  });
  const j = await r.json();
  if (!j.refresh_token) throw new Error('No refresh token returned: ' + JSON.stringify(j));
  fs.writeFileSync(LOCAL, JSON.stringify({ client_id: c.id, client_secret: c.secret, refresh_token: j.refresh_token }, null, 2), { mode: 0o600 });
  console.log('Signed in. Saved to scripts/shorts/.yt-credentials.json (git-ignored).');
  console.log('\nFor GitHub Actions, add this as the repository secret YT_REFRESH_TOKEN:\n\n' + j.refresh_token + '\n');
}

function metaFor(file) {
  const m = file.replace(/\.mp4$/, '.json');
  if (!fs.existsSync(m)) throw new Error('No metadata next to ' + file + ' (expected ' + m + '). Record it with record.js first.');
  return JSON.parse(fs.readFileSync(m, 'utf8'));
}

async function upload(file, opts, access) {
  const meta = metaFor(file), size = fs.statSync(file).size;
  const status = { privacyStatus: opts.privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: false };
  if (opts.publishAt) { status.privacyStatus = 'private'; status.publishAt = opts.publishAt; }
  const body = {
    snippet: { title: meta.title.slice(0, 100), description: meta.description.slice(0, 5000), tags: meta.tags, categoryId: '27', defaultLanguage: 'en' },
    status,
  };
  if (opts.dryRun) { console.log(`\n[dry run] ${file} (${(size / 1e6).toFixed(1)} MB)\n` + JSON.stringify(body, null, 2)); return; }
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + access, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) },
    body: JSON.stringify(body),
  });
  if (!start.ok) throw new Error('YouTube refused the upload: ' + start.status + ' ' + await start.text());
  const put = await fetch(start.headers.get('location'), {
    method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size) }, body: fs.readFileSync(file),
  });
  const j = await put.json();
  if (!put.ok) throw new Error('Upload failed: ' + put.status + ' ' + JSON.stringify(j));
  console.log(`Uploaded ${path.basename(file)} as ${status.privacyStatus}${status.publishAt ? ' (goes public ' + status.publishAt + ')' : ''}: https://youtube.com/shorts/${j.id}`);
  return j.id;
}

(async () => {
  const a = process.argv.slice(2);
  if (a[0] === 'auth') return auth();
  const opts = { privacy: 'private', files: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--privacy') opts.privacy = a[++i];
    else if (a[i] === '--publish-at') opts.publishAt = new Date(a[++i]).toISOString();
    else if (a[i] === '--dry-run') opts.dryRun = true;
    else opts.files.push(a[i]);
  }
  if (!['private', 'unlisted', 'public'].includes(opts.privacy)) throw new Error('--privacy must be private, unlisted or public');
  if (!opts.files.length) { console.error('Usage: node upload.js <clip.mp4>... [--privacy private|unlisted|public] [--publish-at <time>] [--dry-run]'); process.exit(1); }
  let access = null;
  if (!opts.dryRun) {
    const c = creds();
    if (!c.id || !c.secret || !c.refresh) throw new Error('Missing YouTube credentials: set YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN (see README.md).');
    access = await token(c);
  }
  for (const f of opts.files) await upload(f, opts, access);
})().catch(e => { console.error(e.message || e); process.exit(1); });
