/**
 * QDB Sheet: 14-day free trial
 * ---------------------------------------------------------------------------
 * Runs on Dave's own Google account, inside a small "QDB Trials" Google Sheet
 * that acts as the log. Install steps: scripts/trial/INSTALL.md
 *
 * What it does
 *  1. quasidb.com/trial/ posts a request here (Google email + consent).
 *  2. The script checks it (one trial per Google account, daily cap), shares
 *     the QDB Sheet with that account and emails a welcome with a 14-day plan.
 *  3. Every hour it looks at the log:
 *       - 3 days before the end: "your trial ends in 3 days" + PayPal/Patreon.
 *       - after 14 days: removes access and sends a short "trial ended" note.
 *     Anyone marked "paid" in the Status column is never removed.
 *  4. Trial records are deleted 12 months after the trial ends (UK GDPR:
 *     keep only as long as needed). Marketing opt-ins are kept until the
 *     person unsubscribes.
 *
 * Nothing here holds a password or key. It only acts as Dave's account.
 */

// ===== Settings: the only part you may want to change =====================
var CONFIG = {
  // The Google Sheet that trial users get. From its URL: /spreadsheets/d/<THIS PART>/edit
  // Default: the main "Quasidb - Retail sentiment" sheet. Use a copy's id if you prefer.
  TRIAL_SHEET_ID: '1Gdhax-I6KAq-zYe-r8qp5FwZsdaCGRg-5zqLB6hp8YE',

  // 'viewer' (can look, can't change anything) or 'editor'. Match what paying members get.
  ACCESS: 'viewer',

  TRIAL_DAYS: 14,
  REMIND_DAYS_BEFORE: 3,

  // true  = trials start straight away (best for sign-ups).
  // false = every request waits until you type "approve" in its Status cell.
  AUTO_APPROVE: true,

  // Safety valve: after this many new trials in one day, the rest wait for "approve".
  MAX_NEW_PER_DAY: 25,

  // Email Dave (the account running this) about each new trial.
  NOTIFY_ME: true,

  // Delete trial rows this many months after the trial ended (marketing opt-ins are kept).
  KEEP_RECORDS_MONTHS: 12,

  SIGN_OFF: 'Dave\nQDB Trading Desk · quasidb.com',

  LINKS: {
    shop: 'https://quasidb.com/shop/?ref=trial-email#plans',
    patreon: 'https://www.patreon.com/quasidb',
    paypalBasic: 'https://paypal.me/quasidb/20USD',     // Basic includes the Sheet until 31 Dec 2026
    paypalPremium: 'https://paypal.me/quasidb/30USD',   // the Sheet plan from 1 Jan 2027
    paypalYear: 'https://paypal.me/quasidb/220USD',     // Christmas deal, until 31 Dec 2026
    setups: 'https://quasidb.com/setups/?ref=trial-email',
    guide: 'https://quasidb.com/guides/sentiment-in-a-system/?ref=trial-email',
    discord: 'https://discord.gg/2Ccf67favj'
  },
  // Launch offer: Basic = everything (Sheet included) until this date.
  OFFER_ENDS: '2027-01-01T00:00:00Z'
};
// ==========================================================================

var LOG_TAB = 'Trials';
var HEADERS = ['Requested', 'Email', 'Name', 'Status', 'Started', 'Ends', 'Reminder sent', 'Ended', 'Marketing opt-in', 'Source', 'Notes'];
var C = { requested: 1, email: 2, name: 3, status: 4, started: 5, ends: 6, reminded: 7, ended: 8, marketing: 9, source: 10, notes: 11 };
var DAY = 24 * 60 * 60 * 1000;

// ---------- Menu ----------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('QDB Trials')
    .addItem('1. Set up (run once)', 'setup')
    .addItem('Run the hourly check now', 'hourlyCheck')
    .addItem('Send me a test welcome email', 'sendTestEmails')
    .addToUi();
}

/** Run once: makes the log tab and the hourly timer. Safe to run again. */
function setup() {
  var sh = logSheet_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'hourlyCheck') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('hourlyCheck').timeBased().everyHours(1).create();
  // Touch the trial sheet so Google asks for Drive permission now, not on the first visitor.
  var f = DriveApp.getFileById(CONFIG.TRIAL_SHEET_ID);
  sh.getRange('M1').setValue('Trial sheet: ' + f.getName());
  try { SpreadsheetApp.getUi().alert('All set. Trials will share "' + f.getName() + '". Next: Deploy > New deployment > Web app (see INSTALL.md).'); } catch (e) {}
}

// ---------- Web endpoint (the form on quasidb.com/trial/) ----------
function doGet() {
  return json_({ ok: true, status: 'running', note: 'QDB trial endpoint. Use the form at quasidb.com/trial/' });
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return json_({ ok: true, status: 'started' });            // honeypot: bots fill hidden fields
  var email = String(p.email || '').trim().toLowerCase();
  var name = String(p.name || '').trim().slice(0, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return json_({ ok: false, status: 'bad-email' });
  if (p.consent !== 'yes') return json_({ ok: false, status: 'no-consent' });
  var marketing = p.marketing === 'yes';
  var source = String(p.ref || '').slice(0, 40);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = logSheet_(), rows = rows_(sh), key = key_(email), now = new Date();
    for (var i = 0; i < rows.length; i++) {
      if (key_(rows[i].email) === key && String(rows[i].status).toLowerCase() !== 'error') {
        if (marketing && rows[i].marketing !== 'yes') sh.getRange(rows[i].row, C.marketing).setValue('yes');
        return json_({ ok: false, status: 'already', ends: rows[i].ends ? iso_(rows[i].ends) : null });
      }
    }
    var row = [now, email, name, 'pending', '', '', '', '', marketing ? 'yes' : 'no', source, ''];
    sh.appendRow(row);
    var r = sh.getLastRow();

    if (hasAccess_(email)) {
      sh.getRange(r, C.status).setValue('member');
      sh.getRange(r, C.notes).setValue('Already had access to the sheet, nothing changed.');
      return json_({ ok: false, status: 'member' });
    }

    var startedToday = rows.filter(function (x) { return x.started && now - x.started < DAY; }).length;
    if (!CONFIG.AUTO_APPROVE || startedToday >= CONFIG.MAX_NEW_PER_DAY) {
      sh.getRange(r, C.notes).setValue('Waiting: type "approve" in Status to start it.');
      if (CONFIG.NOTIFY_ME) notifyMe_('Trial request waiting: ' + email, 'Type "approve" in its Status cell in the QDB Trials sheet. It starts within the hour.');
      return json_({ ok: true, status: 'pending' });
    }
    var res = startTrial_(sh, r, email, name);
    return json_(res);
  } catch (err) {
    notifyMe_('QDB trial error', String(err && err.stack || err));
    return json_({ ok: false, status: 'error' });
  } finally {
    lock.releaseLock();
  }
}

// ---------- Hourly: approve, remind, end, tidy ----------
function hourlyCheck() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var sh = logSheet_(), now = new Date(), rows = rows_(sh), toDelete = [];
    rows.forEach(function (x) {
      var st = String(x.status).toLowerCase().trim();
      if (st === 'approve' || st === 'approved') { startTrial_(sh, x.row, x.email, x.name); return; }
      if (st === 'active' && x.ends) {
        var leftMs = x.ends - now;
        if (!x.reminded && leftMs <= CONFIG.REMIND_DAYS_BEFORE * DAY && leftMs > 0) {
          sendReminder_(x);
          sh.getRange(x.row, C.reminded).setValue(now);
        }
        if (leftMs <= 0) endTrial_(sh, x);
      }
      // Retention: drop finished trial rows after KEEP_RECORDS_MONTHS unless they opted in to news.
      var ended = x.ended || (st === 'member' || st === 'error' ? x.requested : null);
      if (ended && x.marketing !== 'yes' && st !== 'paid' && now - ended > CONFIG.KEEP_RECORDS_MONTHS * 30.5 * DAY) toDelete.push(x.row);
    });
    toDelete.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  } finally {
    lock.releaseLock();
  }
}

function startTrial_(sh, r, email, name) {
  try {
    var f = DriveApp.getFileById(CONFIG.TRIAL_SHEET_ID);
    if (CONFIG.ACCESS === 'editor') f.addEditor(email); else f.addViewer(email);
  } catch (err) {
    sh.getRange(r, C.status).setValue('error');
    sh.getRange(r, C.notes).setValue('Could not share: ' + err.message + ' (is it a Google account?)');
    notifyMe_('Trial could not start for ' + email, 'Google said: ' + err.message + '\nUsually this means the address is not a Google account. Reply to them if you like.');
    return { ok: false, status: 'not-google' };
  }
  var start = new Date(), ends = new Date(start.getTime() + CONFIG.TRIAL_DAYS * DAY);
  sh.getRange(r, C.status, 1, 3).setValues([['active', start, ends]]);
  sh.getRange(r, C.notes).setValue('');
  sendWelcome_(email, name, ends);
  if (CONFIG.NOTIFY_ME) notifyMe_('New QDB trial: ' + email, 'Started ' + fmt_(start) + ', ends ' + fmt_(ends) + '.\nIf they pay, type "paid" in their Status cell so access is not removed.');
  return { ok: true, status: 'started', ends: iso_(ends) };
}

function endTrial_(sh, x) {
  var note = '';
  try {
    var f = DriveApp.getFileById(CONFIG.TRIAL_SHEET_ID);
    try { f.removeViewer(x.email); } catch (e1) {}
    if (CONFIG.ACCESS === 'editor') { try { f.removeEditor(x.email); } catch (e2) {} }
  } catch (err) { note = 'Remove failed: ' + err.message; }
  sh.getRange(x.row, C.status).setValue(note ? 'error' : 'ended');
  sh.getRange(x.row, C.ended).setValue(new Date());
  if (note) { sh.getRange(x.row, C.notes).setValue(note); notifyMe_('Could not remove trial access for ' + x.email, note); return; }
  sendEnded_(x);
}

// ---------- Emails ----------
function sendWelcome_(email, name, ends) {
  var hi = name ? 'Hi ' + name.split(' ')[0] + ',' : 'Hi,';
  var body = [
    hi, '',
    'Your 14-day free trial of the full QDB Sheet has started. It is now shared with this Google account:',
    'open Google Sheets (or Drive > "Shared with me") and look for the QDB Sheet. It opens on the Start Here tab.',
    '',
    'Your trial runs until ' + fmt_(ends) + '. No card, nothing renews, nothing to cancel.',
    '',
    'A simple plan so the 14 days count:',
    '  Day 1   Start Here, then the Dashboard. Pick 3 pairs you already trade.',
    '  Day 2-3 Crowd Extremes: which of your pairs has the crowd leaning hard one way?',
    '  Day 4-5 QDB Scores: does the technical picture agree with the contrarian read?',
    '  Day 6-7 Your pair\'s own tab: pivots, weekly levels, SSI. Is price at a strong level?',
    '  Week 2  Top 3 Bubble Trades each morning. Write down what you would do, and why.',
    '           Then compare it with what price actually did. That is the before and after.',
    '',
    'One rule above all: never trade sentiment on its own. Use it with your own technical and',
    'fundamental analysis and strict risk management.',
    '',
    'Free extras: today\'s setups ' + CONFIG.LINKS.setups,
    'How it fits a trading system: ' + CONFIG.LINKS.guide,
    'Questions? Just reply to this email.',
    '',
    CONFIG.SIGN_OFF,
    '',
    footer_()
  ].join('\n');
  MailApp.sendEmail({ to: email, subject: 'Your 14-day QDB Sheet trial has started', body: body, name: 'QDB Trading Desk' });
}

function sendReminder_(x) {
  var hi = x.name ? 'Hi ' + String(x.name).split(' ')[0] + ',' : 'Hi,';
  var body = [
    hi, '',
    'A quick heads-up: your free QDB Sheet trial ends on ' + fmt_(x.ends) + ', in about 3 days.',
    '',
    'If it has earned its place in your routine, here is how to keep it:',
    ''
  ].concat(offerLines_()).concat([
    '',
    'Put this Google email (' + x.email + ') in the PayPal note, or reply here after joining on Patreon,',
    'and your access simply carries on with no gap.',
    '',
    'Not for you? No problem, you don\'t need to do anything. Access ends by itself.',
    'I\'d genuinely like to know why, though: one line in a reply helps me make it better.',
    '',
    CONFIG.SIGN_OFF,
    '',
    footer_()
  ]).join('\n');
  MailApp.sendEmail({ to: x.email, subject: 'Your QDB Sheet trial ends in 3 days', body: body, name: 'QDB Trading Desk' });
}

function sendEnded_(x) {
  var body = [
    (x.name ? 'Hi ' + String(x.name).split(' ')[0] + ',' : 'Hi,'), '',
    'Your 14-day QDB Sheet trial has now ended and the sheet is no longer shared with you.',
    'Thanks for giving it a proper look.',
    '',
    'You can pick it back up any time:',
    ''
  ].concat(offerLines_()).concat([
    '',
    'The free QDB Data Lite sheet and the free Discord channels are still yours: ' + CONFIG.LINKS.discord,
    '',
    CONFIG.SIGN_OFF,
    '',
    footer_()
  ]).join('\n');
  MailApp.sendEmail({ to: x.email, subject: 'Your QDB Sheet trial has ended', body: body, name: 'QDB Trading Desk' });
}

function offerLines_() {
  var L = CONFIG.LINKS;
  if (new Date() < new Date(CONFIG.OFFER_ENDS)) return [
    '  Pay as you go (PayPal): Basic, $20 a month, includes the full QDB Sheet AND the Discord',
    '  until 31 December (normally $30). ' + L.paypalBasic,
    '  Christmas deal: a whole year of Basic for $220, price locked for 12 months. ' + L.paypalYear,
    '  Set and forget (Patreon): renews monthly, so access never lapses. ' + L.patreon,
    '  Every plan side by side: ' + L.shop
  ];
  return [
    '  Pay as you go (PayPal): Premium, $30 a month, the full QDB Sheet and Discord. ' + L.paypalPremium,
    '  Set and forget (Patreon): renews monthly, so access never lapses. ' + L.patreon,
    '  Every plan side by side: ' + L.shop
  ];
}

function footer_() {
  return 'You are getting this because you asked for a QDB Sheet trial at quasidb.com/trial/. ' +
    'Educational only, not financial advice. Trading on margin is high risk. ' +
    'To have your details deleted, reply with "delete my data".';
}

function notifyMe_(subject, body) {
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[QDB trials] ' + subject, body); } catch (e) {}
}

/** Menu item: sends the three emails to you so you can see how they read. */
function sendTestEmails() {
  var me = Session.getEffectiveUser().getEmail(), ends = new Date(Date.now() + CONFIG.TRIAL_DAYS * DAY);
  sendWelcome_(me, 'Dave', ends);
  sendReminder_({ email: me, name: 'Dave', ends: new Date(Date.now() + 3 * DAY) });
  sendEnded_({ email: me, name: 'Dave' });
  try { SpreadsheetApp.getUi().alert('Sent 3 test emails to ' + me + '.'); } catch (e) {}
}

// ---------- Helpers ----------
function logSheet_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(LOG_TAB);
  if (!sh) {
    sh = ss.insertSheet(LOG_TAB, 0);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('E:H').setNumberFormat('d mmm yyyy hh:mm');
    sh.getRange('A:A').setNumberFormat('d mmm yyyy hh:mm');
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['pending', 'approve', 'active', 'paid', 'ended', 'member', 'error'], true)
      .setAllowInvalid(true).build();
    sh.getRange('D2:D').setDataValidation(rule);
  }
  return sh;
}

function rows_(sh) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, HEADERS.length).getValues().map(function (v, i) {
    return {
      row: i + 2, requested: v[0] || null, email: String(v[1]).trim().toLowerCase(), name: v[2], status: v[3],
      started: v[4] || null, ends: v[5] || null, reminded: v[6] || null, ended: v[7] || null,
      marketing: String(v[8]).toLowerCase(), source: v[9]
    };
  }).filter(function (x) { return x.email; });
}

/** One trial per Google account: Gmail ignores dots and anything after "+". */
function key_(email) {
  var m = String(email).toLowerCase().trim().match(/^([^@]+)@(.+)$/);
  if (!m) return email;
  var user = m[1], dom = m[2] === 'googlemail.com' ? 'gmail.com' : m[2];
  if (dom === 'gmail.com') user = user.replace(/\+.*$/, '').replace(/\./g, '');
  return user + '@' + dom;
}

function hasAccess_(email) {
  var f = DriveApp.getFileById(CONFIG.TRIAL_SHEET_ID), k = key_(email);
  var people = f.getViewers().concat(f.getEditors());
  try { if (key_(f.getOwner().getEmail()) === k) return true; } catch (e) {}
  return people.some(function (u) { return key_(u.getEmail()) === k; });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function iso_(d) { return new Date(d).toISOString(); }
function fmt_(d) { return Utilities.formatDate(new Date(d), 'Europe/London', 'EEEE d MMMM'); }
