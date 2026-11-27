/* QDB "Setups to watch": scans the live pair dashboards (the same published
   "QDB Analytics Public" sheet that /analytics/ reads) and keeps only markets where
   three things line up:
     1. the QDB Score leans clearly one way,
     2. the retail crowd sits on the other side (contrarian read),
     3. price is at, or close to, a strong weekly/monthly level (or a Daily Bollinger
        Band) on the side that suits the trade: resistance above for sells, support
        below for buys.
   Sentiment on its own is never a trade, so no level = no setup.
   Used by /setups/ and the homepage band. Exposes window.QDBSetups.scan(). */
(function(){
'use strict';
var FX = ['AUDCAD','AUDCHF','AUDJPY','AUDNZD','AUDUSD','CADCHF','CADJPY','CHFJPY','EURAUD','EURCAD','EURCHF','EURGBP','EURJPY','EURNZD','EURUSD','GBPAUD','GBPCAD','GBPCHF','GBPJPY','GBPNZD','GBPUSD','NZDCAD','NZDCHF','NZDJPY','NZDUSD','USDCAD','USDCHF','USDJPY'];
var IDX = ['SPX500','US30','NAS100','UK100','GER40','FRA40','US2000'];
var IDX_NAME = {SPX500:'S&P 500',US30:'Dow Jones 30',NAS100:'Nasdaq 100',UK100:'FTSE 100',GER40:'DAX 40',FRA40:'CAC 40',US2000:'Russell 2000'};
var ALL = FX.concat(IDX);
// Same published sheet and tab ids as analytics/index.html. Keep the two in step.
var BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTTWwh8vdvIjzOxGvIDCjR05tZtZwtOjwhpM25aUcgbv4wXuZezmMXkR5_jqxhKXNo713PbJXRH7YN0/pub';
var GID = {SPX500:0,US30:1295520178,NAS100:1549744721,UK100:1632370860,GER40:408307758,FRA40:2097298862,US2000:2005171773,
  AUDCAD:1016142867,AUDCHF:952463102,AUDJPY:98476169,AUDNZD:1877855708,AUDUSD:672364947,CADCHF:519122340,CADJPY:1020669219,CHFJPY:1002553994,
  EURAUD:1948454224,EURCAD:1866147707,EURCHF:2016210783,EURGBP:744185477,EURJPY:676608706,EURNZD:173677714,EURUSD:982406586,
  GBPAUD:708669208,GBPCAD:1800643929,GBPCHF:794060753,GBPJPY:777063313,GBPUSD:479131026,GBPNZD:210887471,
  NZDCAD:1093561562,NZDCHF:154565602,NZDJPY:301104910,NZDUSD:1830829538,USDCAD:590361703,USDCHF:852931922,USDJPY:394480278};

// Rules (tuned so a normal day gives a handful, not a wall).
var RULE = {
  bearMax: 0.36,      // score / max at or below this = clearly bearish
  bullMin: 0.64,      // at or above this = clearly bullish
  crowdFx: 60,        // FX: crowd at least 60% on the wrong side
  crowdIdx: 55,       // indices (FXCM SSI is less one-sided)
  extreme: 85,        // beyond 85/15 the crowd can stay right for a while: flag "wait"
  near: 1.5,          // strong level within 1.5 x ADR on the right side
  atLevel: 0.35,      // within 0.35 x ADR = "at the level now"
  through: 0.25       // price may have poked up to 0.25 x ADR through the level
};
// Strong levels only: monthly/weekly pivots, weekly open, daily Bollinger Bands.
// Daily pivots and the previous day's high/low are too minor to hang a trade on.
var STRONG = /^(Monthly (R\d|S\d|Pivot)|Weekly (R\d|S\d|Pivot|Open)|Daily BB (upper|lower))$/;

function T(s){ return String(s == null ? '' : s).trim(); }
function num(s){ var m = String(s == null ? '' : s).replace(/,/g,'').match(/[-+]?\d*\.?\d+/); return m ? parseFloat(m[0]) : NaN; }
function isFx(sym){ return FX.indexOf(sym) >= 0; }
function label(sym){ return isFx(sym) ? sym.slice(0,3) + '/' + sym.slice(3) : sym; }

function parseCSV(text){
  var rows = [], row = [], cell = '', q = false;
  for (var i = 0; i < text.length; i++){
    var c = text[i];
    if (q){
      if (c === '"'){ if (text[i+1] === '"'){ cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ','){ row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r'){ if (c === '\r' && text[i+1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length){ row.push(cell); rows.push(row); }
  return rows;
}

// Read the parts of a pair dashboard we need (columns B=1 ... O=14), matched by heading text like /analytics/.
var B=1,D=3,E=4,F=5,H=7,I=8,K=10,M=12;
function extract(sym, rows){
  function at(r,c){ return T((rows[r] || [])[c]); }
  function find(col, re){ for (var r = 0; r < rows.length; r++) if (re.test(at(r,col))) return r; return -1; }
  var d = {sym: sym, fx: isFx(sym), label: label(sym), kind: isFx(sym) ? 'FX pair' : IDX_NAME[sym]};
  d.banner = at(2,B);
  var h = find(B, /^(Pair|Index)$/), hv = h >= 0 ? h + 1 : 4;
  d.scoreName = at(h,H) || 'QDB Score';
  d.price = at(hv,D); d.change = at(hv,F); d.bias = at(hv,K);
  var sm = at(hv,H).match(/(\d+)\s*\/\s*(\d+)/);
  d.score = sm ? +sm[1] : NaN; d.max = sm ? +sm[2] : NaN;
  d.ladder = []; d.unit = d.fx ? 'pips' : 'pts';
  var lr = find(B, /Price Ladder/);
  if (lr >= 0){
    var u = at(lr+1,F).match(/\(([^)]+)\)/); if (u) d.unit = u[1];
    for (var r = lr + 2; r < rows.length; r++){
      var lv = at(r,B);
      if (!lv || /^🔴/.test(lv)) break;
      d.ladder.push({name: lv, price: at(r,E), dist: num(at(r,F)), here: /PRICE IS HERE/i.test(lv)});
    }
  }
  d.longPct = NaN;
  var cr = find(I, /Crowd vs Price/);
  if (cr >= 0){
    for (var r2 = cr + 1; r2 < cr + 14 && r2 < rows.length; r2++){
      if (/Crowd long % \(now\)/i.test(at(r2,I))) { d.longPct = num(at(r2,K)); break; }
    }
  }
  var ar = find(I, /Previous Day Range/);
  d.adr = ar >= 0 ? num(at(ar+2,M)) : NaN;
  return d;
}

function load(sym){
  return fetch(BASE + '?gid=' + GID[sym] + '&single=true&output=csv', {cache:'no-store'})
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function(t){ if (/^\s*</.test(t)) throw new Error('not CSV'); return extract(sym, parseCSV(t)); });
}

// Decide whether one market is a setup. Returns null when it isn't.
function judge(d){
  if (isNaN(d.score) || isNaN(d.max) || !d.max || isNaN(d.longPct) || !(d.adr > 0)) return null;
  var ratio = d.score / d.max, need = d.fx ? RULE.crowdFx : RULE.crowdIdx, dir = null;
  if (ratio <= RULE.bearMax && d.longPct >= need) dir = 'sell';
  else if (ratio >= RULE.bullMin && 100 - d.longPct >= need) dir = 'buy';
  if (!dir) return null;
  // nearest strong level on the side that suits the trade (dist is level minus price)
  var best = null;
  d.ladder.forEach(function(l){
    if (l.here || isNaN(l.dist) || !STRONG.test(l.name)) return;
    var away = dir === 'sell' ? l.dist : -l.dist;          // positive = still to come
    if (away < -RULE.through * d.adr || away > RULE.near * d.adr) return;
    var c = {name: l.name, price: l.price, dist: l.dist, away: away};
    // prefer a level still ahead of price; one price has just poked through only if nothing is ahead
    if (!best || (away >= 0) > (best.away >= 0) || ((away >= 0) === (best.away >= 0) && Math.abs(away) < Math.abs(best.away))) best = c;
  });
  if (!best) return null;
  var crowdWrong = dir === 'sell' ? d.longPct : 100 - d.longPct;
  var conviction = Math.abs(ratio - 0.5) * 2;                    // 0..1
  var crowdPart = Math.min(1, (crowdWrong - 50) / 40);          // 0..1
  var nearPart = 1 - Math.min(1, Math.abs(best.away) / (RULE.near * d.adr));
  return {
    dir: dir, level: best, crowdWrong: crowdWrong,
    at: Math.abs(best.away) <= RULE.atLevel * d.adr,
    extreme: crowdWrong >= RULE.extreme,
    rank: (conviction * 0.45 + crowdPart * 0.35 + nearPart * 0.2) * (crowdWrong >= RULE.extreme ? 0.8 : 1) // "wait" ones rank lower
  };
}

// Scan every market. onProgress(done, total) is optional. Resolves {setups, scanned, failed, at}.
function scan(onProgress){
  var done = 0, out = [], failed = 0, queue = ALL.slice(), active = 0;
  return new Promise(function(resolve){
    function next(){
      if (!queue.length && !active) {
        out.sort(function(a, b){ return b.setup.rank - a.setup.rank; });
        resolve({setups: out, scanned: ALL.length - failed, failed: failed, at: new Date()});
        return;
      }
      while (active < 6 && queue.length){
        var sym = queue.shift(); active++;
        load(sym).then(function(d){ var s = judge(d); if (s) { d.setup = s; out.push(d); } },
                       function(){ failed++; })
          .then(function(){ active--; done++; if (onProgress) onProgress(done, ALL.length); next(); });
      }
    }
    next();
  });
}

function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function fmtDist(n, unit){ var a = Math.abs(n); return (a >= 100 ? Math.round(a).toLocaleString('en-GB') : a.toFixed(1).replace(/\.0$/, '')) + ' ' + unit; }

// Plain-English lines explaining why a market made the list.
function reasons(d){
  var s = d.setup, sell = s.dir === 'sell', lv = s.level;
  var where = s.at
    ? 'Price is <b>at ' + esc(lv.name) + '</b> (' + esc(lv.price) + ')' + (sell ? ', a strong resistance.' : ', a strong support.')
    : 'Price is <b>' + fmtDist(s.level.away, d.unit) + (sell ? ' below ' : ' above ') + esc(lv.name) + '</b> (' + esc(lv.price) + '), the next strong ' + (sell ? 'resistance' : 'support') + '.';
  return [
    '<b>' + Math.round(s.crowdWrong) + '% of retail traders are ' + (sell ? 'long' : 'short') + '</b>. Read contrarian, that leans ' + (sell ? 'bearish' : 'bullish') + '.',
    'The ' + esc(d.scoreName) + ' is <b>' + d.score + ' / ' + d.max + '</b> (' + esc(d.bias || (sell ? 'Bearish' : 'Bullish')) + '), so the technical checks agree.',
    where
  ];
}
function status(d){
  var s = d.setup;
  if (s.extreme) return {cls: 'wait', txt: '⏳ Crowd extreme: wait for price to confirm'};
  if (s.at) return {cls: 'ready', txt: '🎯 At the level now'};
  return {cls: 'near', txt: '👀 Approaching the level'};
}

window.QDBSetups = {scan: scan, reasons: reasons, status: status, esc: esc, fmtDist: fmtDist, total: ALL.length, RULE: RULE, _judge: judge, _extract: extract, _parseCSV: parseCSV};
})();
