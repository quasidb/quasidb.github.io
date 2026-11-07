#!/usr/bin/env python3
"""Build the free per-pair sentiment pages (/sentiment/<pair>/) and the hub (/sentiment/).

Inputs (all already in the repo):
  data/crowd-history.json  daily crowd snapshots from scripts/crowd.py (% long, QDB Score)
  data/cot.json            weekly COT positioning from scripts/cot.py

Each page is plain HTML with the numbers written in, so search engines and link
previews see today's figures without running JavaScript. The daily crowd
workflow runs this right after scripts/crowd.py.

    python3 scripts/pair_pages.py              # writes sentiment/**, updates sitemap.xml
    python3 scripts/pair_pages.py --out /tmp/s --no-sitemap
"""
import argparse
import html
import json
import os
import re
from datetime import date

SITE = "https://quasidb.com"
FX = ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"]   # market-convention base order
PAIRS = [a + b for i, a in enumerate(FX) for b in FX[i + 1:]]      # the 28 pairs
NAMES = {"EUR": "Euro", "GBP": "British pound", "AUD": "Australian dollar", "NZD": "New Zealand dollar",
         "USD": "US dollar", "CAD": "Canadian dollar", "CHF": "Swiss franc", "JPY": "Japanese yen"}
NICK = {"EURUSD": "Fiber", "GBPUSD": "Cable", "USDJPY": "Ninja", "AUDUSD": "Aussie", "NZDUSD": "Kiwi",
        "USDCAD": "Loonie", "USDCHF": "Swissie", "GBPJPY": "the Dragon", "EURJPY": "Yuppy"}
CROWD_EDGE = 60       # crowd at 60%+ one way gives a contrarian lean
COT_EDGE = 30         # pair COT score (base index minus quote index) of +/-30 counts as a bias
HISTORY_DAYS = 60

e = html.escape


def slash(p):
    return p[:3] + "/" + p[3:]


def nice(iso):
    d = date.fromisoformat(iso[:10])
    return f"{d.strftime('%A')} {d.day} {d.strftime('%B %Y')}"


def stamp(at):
    """'2026-11-07T22:01Z' -> 'Saturday 7 November 2026, 22:01 UTC'"""
    return nice(at) + (f", {at[11:16]} UTC" if len(at) >= 16 else "")


def short(iso):
    d = date.fromisoformat(iso[:10])
    return f"{d.day} {d.strftime('%b')}"


def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


# ---------- the three reads ----------

def crowd_read(c):
    """Returns (side, sentence). side: 'bull' / 'bear' / None (contrarian)."""
    if not c or "long" not in c:
        return None, None
    lg = round(c["long"])
    if lg >= CROWD_EDGE:
        return "bear", f"The retail crowd is <b>{lg}% long</b>. Most of them need price to go up, so the contrarian lean is <b class=\"sell\">bearish</b>."
    if lg <= 100 - CROWD_EDGE:
        return "bull", f"The retail crowd is <b>{100 - lg}% short</b>. Most of them need price to go down, so the contrarian lean is <b class=\"buy\">bullish</b>."
    return None, f"The crowd is split, <b>{lg}% long</b> and {100 - lg}% short. There is no strong edge from sentiment today."


def score_read(c):
    if not c or c.get("score") is None:
        return None, None
    sc = c["score"]
    if sc >= 7:
        return "bull", f"The <b>QDB Score is {sc}/12</b>, a <b class=\"buy\">bullish</b> reading."
    if sc <= 3:
        return "bear", f"The <b>QDB Score is {sc}/12</b>, a <b class=\"sell\">bearish</b> reading."
    return None, f"The <b>QDB Score is {sc}/12</b>, neutral. No call either way."


def cot_read(pair, cot):
    if not cot:
        return None, None, None
    sc = next((p["score"] for p in cot.get("pairs", []) if p["pair"] == pair), None)
    if sc is None:
        return None, None, None
    b, q = pair[:3], pair[3:]
    if sc >= COT_EDGE:
        return "bull", sc, f"Large speculators favour the <b>{NAMES[b]}</b> over the {NAMES[q]} (COT score <b class=\"buy\">{sc:+.0f}</b>)."
    if sc <= -COT_EDGE:
        return "bear", sc, f"Large speculators favour the <b>{NAMES[q]}</b> over the {NAMES[b]} (COT score <b class=\"sell\">{sc:+.0f}</b>)."
    return None, sc, f"Large speculators show no strong bias between the two (COT score {sc:+.0f})."


def verdict(sides):
    bull, bear = sides.count("bull"), sides.count("bear")
    n = len([s for s in sides if s is not None])
    if bull and not bear:
        return "bull", ("Everything that has a view leans bullish." if bull > 1 else "One bullish lean, nothing against it.")
    if bear and not bull:
        return "bear", ("Everything that has a view leans bearish." if bear > 1 else "One bearish lean, nothing against it.")
    if bull and bear:
        return "mixed", "The signals disagree. Mixed pictures are where patience pays."
    return None, "No strong lean from any of the three today." if n == 0 else "No clear lean today."


LABEL = {"bull": ("Bullish lean", "buy"), "bear": ("Bearish lean", "sell"), "mixed": ("Mixed", "mixed"), None: ("No edge", "flat")}


# ---------- small pieces of HTML ----------

def meter(long_pct):
    lg = round(long_pct)
    return (f'<div class="meter" role="img" aria-label="{lg}% long, {100 - lg}% short">'
            f'<div class="l" style="width:{lg}%">{str(lg) + "% long" if lg >= 18 else ""}</div>'
            f'<div class="s" style="width:{100 - lg}%">{str(100 - lg) + "% short" if 100 - lg >= 18 else ""}</div></div>')


def spark(points, w=640, h=150):
    """Crowd % long over time on a 0-100 scale, with the 50% line."""
    if len(points) < 2:
        return ""
    pad = 6
    xs = [pad + i * (w - 2 * pad) / (len(points) - 1) for i in range(len(points))]
    y = lambda v: pad + (100 - v) / 100 * (h - 2 * pad)  # noqa: E731
    path = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y(v):.1f}" for i, (x, (_, v)) in enumerate(zip(xs, points)))
    last = points[-1][1]
    return (f'<svg class="hist" viewBox="0 0 {w} {h}" role="img" aria-label="Crowd % long over the last {len(points)} days, now {last:.0f}%">'
            f'<rect x="0" y="0" width="{w}" height="{y(50):.1f}" fill="rgba(34,197,94,.06)"/>'
            f'<rect x="0" y="{y(50):.1f}" width="{w}" height="{h - y(50):.1f}" fill="rgba(239,68,68,.06)"/>'
            f'<line x1="0" x2="{w}" y1="{y(50):.1f}" y2="{y(50):.1f}" class="mid"/>'
            f'<path d="{path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'
            f'<circle cx="{xs[-1]:.1f}" cy="{y(last):.1f}" r="5" fill="var(--accent)"/>'
            f'<text x="{pad}" y="16" class="ax">100% long</text><text x="{pad}" y="{h - 8}" class="ax">100% short</text></svg>'
            f'<div class="axd"><span>{short(points[0][0])}</span><span>{short(points[-1][0])}</span></div>')


def idx_bar(label, v):
    v = max(0, min(100, v))
    return (f'<div class="ib"><span>{e(label)}</span><div class="bar"><i style="left:{v:.0f}%"></i></div>'
            f'<b>{v:.0f}</b></div>')


# ---------- pages ----------

HEAD_CSS = """
.small{font-size:15px}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-family:var(--mono);font-size:14px;color:var(--muted);margin-top:14px}
.meta .upd{color:var(--buy);font-weight:600}
.meta .upd::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--buy);margin-right:7px;vertical-align:1px}
.buy{color:var(--buy)} .sell{color:var(--sell)}
.meter{display:flex;height:40px;border-radius:12px;overflow:hidden;font-family:var(--mono);font-weight:700;font-size:16px;margin-top:12px}
.meter div{display:flex;align-items:center;padding:0 12px;white-space:nowrap;min-width:0}
.meter .l{background:var(--buy);color:#04210f}
.meter .s{background:var(--sell);color:#2a0606;justify-content:flex-end}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
@media (max-width:760px){.grid3{grid-template-columns:1fr}}
.sig{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
.sig h3{font-size:14px;font-family:var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--dim);font-weight:600}
.sig .big{font-family:var(--mono);font-size:34px;font-weight:700;margin:4px 0 6px;line-height:1.1}
.sig p{color:var(--muted);font-size:16px}
.sig p b{color:var(--text)} .sig p b.buy{color:var(--buy)} .sig p b.sell{color:var(--sell)}
.pill{display:inline-block;font-family:var(--mono);font-weight:700;font-size:14px;letter-spacing:.05em;text-transform:uppercase;border-radius:8px;padding:5px 10px;border:2px solid currentColor}
.pill.buy{color:var(--buy)} .pill.sell{color:var(--sell)} .pill.mixed{color:var(--accent)} .pill.flat{color:var(--muted)}
.read{margin-top:18px;border-left:4px solid var(--accent);background:rgba(245,184,61,.07);border-radius:0 14px 14px 0;padding:14px 18px;max-width:46em}
.read p{color:var(--muted);margin-top:6px} .read b{color:var(--text)}
.hist{display:block;width:100%;height:auto;margin-top:12px}
.hist .mid{stroke:var(--line);stroke-dasharray:4 4} .hist .ax{fill:var(--dim);font:12px var(--mono)}
.axd{display:flex;justify-content:space-between;font-family:var(--mono);font-size:13px;color:var(--dim)}
.ib{display:grid;grid-template-columns:48px 1fr 34px;align-items:center;gap:10px;margin-top:10px;font-family:var(--mono);font-size:15px}
.bar{position:relative;height:8px;border-radius:4px;background:linear-gradient(90deg,rgba(239,68,68,.35),rgba(147,160,184,.12) 50%,rgba(34,197,94,.35))}
.bar i{position:absolute;top:-4px;width:4px;height:16px;border-radius:2px;margin-left:-2px;background:var(--text)}
.lock{display:grid;gap:8px;margin-top:12px}
.lock div{display:flex;justify-content:space-between;gap:10px;background:var(--bg2);border:1px dashed var(--line);border-radius:12px;padding:10px 14px;color:var(--muted);font-size:16px}
.lock b{font-family:var(--mono);color:var(--dim);filter:blur(4px);user-select:none}
.others{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:12px}
.others a{display:flex;justify-content:space-between;gap:6px;border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:9px 11px;font-family:var(--mono);font-size:14px;text-decoration:none;color:var(--text)}
.others a:hover{border-color:var(--accent)}
.tbl{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:15px}
.tbl th,.tbl td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
.tbl thead th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);font-weight:600}
.tbl th:first-child,.tbl td:first-child{text-align:left}
.tbl a{color:var(--text);font-weight:700;text-decoration:none} .tbl a:hover{color:var(--accent)}
.tbl .mini{display:inline-block;width:70px;height:8px;border-radius:4px;overflow:hidden;background:var(--sell);vertical-align:middle;margin-left:8px}
.tbl .mini i{display:block;height:100%;background:var(--buy)}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.faq details{border-bottom:1px solid var(--line);padding:12px 0;max-width:48em}
.faq summary{cursor:pointer;font-weight:600}
.faq p{color:var(--muted);margin-top:8px}
@media (max-width:640px){.hide-sm{display:none}.tbl{font-size:14px}.tbl th,.tbl td{padding:9px 5px}.tbl .mini{display:none}}
"""


def head(title, desc, url, depth, ld, og_title):
    up = "../" * depth
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Generated by scripts/pair_pages.py. Edit the script, not this file. -->
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="QDB Trading Desk">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(og_title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(og_title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE}/og-image.png">
<meta name="theme-color" content="#0b0f17">
<link rel="icon" href="{up}logo.png">
<script type="application/ld+json">{json.dumps(ld, separators=(",", ":"))}</script>
<script data-goatcounter="https://quasidb.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{up}guides/guides.css">
<style>{HEAD_CSS}</style>
</head>
<body>
<nav class="top"><div class="wrap">
  <a class="brand" href="{up}?ref=sentiment"><img src="{up}logo.png" alt="">QDB Trading Desk</a>
  <div class="navl"><a href="{up}sentiment/"{' aria-current="page"' if depth == 1 else ''}>Sentiment</a><a href="{up}cot/?ref=sentiment">COT</a><a href="{up}games/?ref=sentiment">Games</a><a href="{up}?ref=sentiment#pricing">Pricing</a></div>
</div></nav>
"""


def pair_page(pair, snap, hist, cot):
    c = (snap or {}).get("pairs", {}).get(pair)
    url = f"{SITE}/sentiment/{pair.lower()}/"
    b, q = pair[:3], pair[3:]
    cs, csent = crowd_read(c)
    ss, ssent = score_read(c)
    ks, kscore, ksent = cot_read(pair, cot)
    v, vsent = verdict([cs, ss, ks])
    vl, vc = LABEL[v]
    asof = stamp(snap["at"]) if snap else None
    nick = f" ({NICK[pair]})" if pair in NICK else ""

    lg = round(c["long"]) if c and "long" in c else None
    if lg is not None:
        title = f"{slash(pair)} Retail Sentiment Today: {lg}% of traders long | QDB"
        og_title = f"{slash(pair)}: the retail crowd is {lg}% long" + (f" and {100 - lg}% short" if 40 < lg < 60 else "")
    else:
        title = f"{slash(pair)} Sentiment Today: QDB Score and COT positioning | QDB"
        og_title = f"{slash(pair)} sentiment today: QDB Score and COT"
    bits = []
    if lg is not None:
        bits.append(f"{lg}% of retail traders are long {slash(pair)}")
    if c and c.get("score") is not None:
        bits.append(f"QDB Score {c['score']}/12")
    if kscore is not None:
        bits.append(f"COT score {kscore:+.0f}")
    desc = (f"{slash(pair)}{nick} sentiment" + (f" on {short(snap['at'])}" if snap else "") + ": " + ", ".join(bits) +
            f". Contrarian read: {vl.lower()}. Free daily page from QDB, updated every weekday.") if bits else \
           f"{slash(pair)} retail sentiment, QDB Score and COT positioning, updated every weekday by QDB."

    # crowd history
    pts = [(s["date"], s["pairs"][pair]["long"]) for s in hist[-HISTORY_DAYS:] if "long" in s["pairs"].get(pair, {})]
    hist_html = spark(pts) if len(pts) >= 2 else \
        '<p class="muted small" style="margin-top:10px">The history chart builds up one day at a time from the first snapshot. Check back tomorrow.</p>'
    lo_hi = ""
    if len(pts) >= 5:
        vals = [p[1] for p in pts]
        lo_hi = f'<p class="muted small" style="margin-top:8px">Range over the last {len(pts)} snapshots: {min(vals):.0f}% to {max(vals):.0f}% long.</p>'

    cards = []
    if lg is not None:
        cards.append(f'<div class="sig"><h3>Retail crowd</h3><div class="big {"sell" if cs == "bear" else "buy" if cs == "bull" else ""}">{lg}% long</div><p>{csent}</p></div>')
    else:
        cards.append('<div class="sig"><h3>Retail crowd</h3><div class="big" style="color:var(--dim)">Members</div><p>The crowd % for this pair is in the QDB Sheet, updated every 15 minutes.</p></div>')
    if ssent:
        cards.append(f'<div class="sig"><h3>QDB Score</h3><div class="big {"buy" if ss == "bull" else "sell" if ss == "bear" else ""}">{c["score"]}<small style="font-size:18px;color:var(--dim)">/12</small></div><p>{ssent}</p></div>')
    if ksent:
        cards.append(f'<div class="sig"><h3>COT (weekly)</h3><div class="big {"buy" if ks == "bull" else "sell" if ks == "bear" else ""}">{kscore:+.0f}</div><p>{ksent}</p></div>')

    cot_html = ""
    if cot and b in cot.get("currencies", {}) or cot and q in cot.get("currencies", {}):
        cur = cot["currencies"]
        bars = "".join(idx_bar(x, cur[x]["index"]) for x in (b, q) if x in cur)
        cot_html = f"""
  <section class="sec" id="cot">
    <h2>What the big speculators hold</h2>
    <p class="muted">COT index for each currency: where large speculators' net position sits in its 3-year range, 0 = most short, 100 = most long. Positions on {e(nice(cot['report_date']))}.</p>
    <div class="card" style="margin-top:12px;max-width:560px">{bars}</div>
    <p class="small" style="margin-top:10px"><a href="../../cot/?ref=sentiment-{pair.lower()}">See the full COT report →</a></p>
  </section>"""

    others = "".join(
        f'<a href="../{p.lower()}/">{slash(p)}<span class="{ "sell" if (snap and snap["pairs"].get(p, {}).get("long", 50) >= CROWD_EDGE) else "buy" if (snap and snap["pairs"].get(p, {}).get("long", 50) <= 100 - CROWD_EDGE) else "muted"}">{str(round(snap["pairs"][p]["long"])) + "%" if snap and "long" in snap["pairs"].get(p, {}) else "·"}</span></a>'
        for p in PAIRS if p != pair)

    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "en",
         "dateModified": (snap or {}).get("at", "")[:10] or None,
         "isPartOf": {"@type": "WebSite", "name": "QDB Trading Desk", "url": SITE + "/"},
         "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "QDB", "item": SITE + "/"},
             {"@type": "ListItem", "position": 2, "name": "Sentiment", "item": SITE + "/sentiment/"},
             {"@type": "ListItem", "position": 3, "name": slash(pair), "item": url}]}},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f"Are retail traders long or short {slash(pair)}?",
             "acceptedAnswer": {"@type": "Answer", "text": (f"At the latest QDB snapshot ({short(snap['at'])}), {lg}% of retail traders were long {slash(pair)} and {100 - lg}% short." if lg is not None and snap else f"The live retail split for {slash(pair)} is in the QDB Sheet, updated every 15 minutes.")}},
            {"@type": "Question", "name": "How do you trade retail sentiment?",
             "acceptedAnswer": {"@type": "Answer", "text": "Contrarian: when most retail traders are on one side, look the other way, but only at strong daily or weekly supply and demand levels, never on sentiment alone."}}]}]}

    upd = f'<span class="upd">Snapshot {e(asof)}</span>' if asof else '<span>First snapshot coming soon</span>'
    return head(title, desc, url, 2, ld, og_title) + f"""
<main class="wrap">
  <header class="hero">
    <p class="kick">Free · updated every weekday · {e(NAMES[b])} vs {e(NAMES[q])}</p>
    <h1>{slash(pair)} <em>sentiment</em> today</h1>
    <p class="lead">Where the retail crowd stands on {slash(pair)}{e(nick)}, what the QDB Score says, and how the big speculators are positioned. Read together, in plain English.</p>
    <p class="meta">{upd}<span>Contrarian read</span></p>
    {meter(c["long"]) if lg is not None else ""}
  </header>

  <section class="sec" id="read">
    <h2>Today's read: <span class="pill {vc}">{vl}</span></h2>
    <div class="grid3">{''.join(cards)}</div>
    <div class="read"><b>{e(vsent)}</b><p>One rule above all: <b>only act at strong daily or weekly supply and demand levels.</b> Sentiment tells you who is likely to be wrong. The level tells you where.</p></div>
  </section>

  <section class="sec" id="history">
    <h2>The crowd over time</h2>
    <p class="muted">Retail % long at each daily snapshot. Above the dashed line the crowd is mostly long, below it mostly short. Watch the direction of travel as much as the level.</p>
    <div class="card" style="margin-top:12px">{hist_html}{lo_hi}</div>
  </section>
{cot_html}
  <section class="sec" id="inside">
    <h2>In the QDB Sheet, live</h2>
    <p class="muted">This page is a once-a-day snapshot. Members see {slash(pair)} update every 15 minutes, alongside the rest of the board.</p>
    <div class="lock">
      <div><span>Crowd shift since the open</span><b>●●●●</b></div>
      <div><span>FXCM SSI and its change today</span><b>●●●●</b></div>
      <div><span>Basket Shifting board for {e(b)} and {e(q)}</span><b>●●●●</b></div>
      <div><span>Sentiment Delta indicator on your MT5 chart</span><b>●●●●</b></div>
    </div>
    <div class="row"><a class="btn primary" href="../../?ref=sentiment-{pair.lower()}#pricing" data-goatcounter-click="sentiment-{pair.lower()}-pricing">Get the QDB Sheet</a><a class="btn" href="../../games/beat-the-crowd/?ref=sentiment-{pair.lower()}">Play today's Beat the Crowd</a></div>
  </section>

  <section class="sec faq" id="faq">
    <h2>{slash(pair)} sentiment questions</h2>
    <details open><summary>Are retail traders long or short {slash(pair)}?</summary><p>{(f"At the latest snapshot, <b>{lg}%</b> of retail traders were long and {100 - lg}% short." if lg is not None else "The live split for this pair is in the QDB Sheet.")} The page updates every weekday at about 5pm UK.</p></details>
    <details><summary>Why read retail sentiment as contrarian?</summary><p>Most retail traders lose, and they tend to buy falling markets and sell rising ones. When the crowd piles onto one side, the stops and losing positions on that side become fuel for a move the other way. That is why a crowd that is heavily long is read as bearish.</p></details>
    <details><summary>Should I trade on sentiment alone?</summary><p>No. A crowd can stay wrong for a long time. QDB only acts on sentiment at strong daily or weekly supply and demand levels, and treats it as one input next to the QDB Score and the COT positioning above.</p></details>
    <details><summary>What is the QDB Score?</summary><p>A 0 to 12 score for each pair that combines retail positioning, how it is shifting and the trend. 7 or more reads bullish, 3 or less bearish. <a href="../../guides/?ref=sentiment-{pair.lower()}">The guides explain how it works.</a></p></details>
  </section>

  <section class="sec" id="more">
    <h2>Other pairs</h2>
    <p class="muted">Crowd % long at the latest snapshot. Red: crowd heavily long (contrarian bearish). Green: crowd heavily short (contrarian bullish).</p>
    <div class="others">{others}</div>
    <p class="small" style="margin-top:12px"><a href="../">All 28 pairs in one table →</a></p>
  </section>

  <p class="foot">Crowd data: QDB Sheet daily snapshot. COT: CFTC Commitments of Traders, Legacy futures-only. Educational only, not financial advice. Trading on margin carries a high level of risk. <a href="../../">Back to QDB Trading Desk</a></p>
</main>
</body>
</html>
"""


def hub_page(snap, cot):
    url = f"{SITE}/sentiment/"
    rows = []
    for p in PAIRS:
        c = (snap or {}).get("pairs", {}).get(p)
        cs, _ = crowd_read(c)
        ss, _ = score_read(c)
        ks, ksc, _ = cot_read(p, cot)
        v, _ = verdict([cs, ss, ks])
        lg = round(c["long"]) if c and "long" in c else None
        rows.append((abs(lg - 50) if lg is not None else -1, p, c, lg, ksc, v))
    rows.sort(key=lambda r: (-r[0], r[1]))
    trs = []
    for _, p, c, lg, ksc, v in rows:
        vl, vc = LABEL[v]
        crowd = (f'{lg}% long<span class="mini hide-sm"><i style="width:{lg}%"></i></span>' if lg is not None else '<span style="color:var(--dim)">members</span>')
        sc = c.get("score") if c else None
        scc = "buy" if sc is not None and sc >= 7 else "sell" if sc is not None and sc <= 3 else ""
        trs.append(f'<tr><td><a href="{p.lower()}/">{slash(p)}</a></td><td>{crowd}</td>'
                   f'<td class="{scc}">{"" if sc is None else str(sc) + "/12"}</td>'
                   f'<td class="hide-sm {"buy" if (ksc or 0) >= COT_EDGE else "sell" if (ksc or 0) <= -COT_EDGE else ""}">{"" if ksc is None else f"{ksc:+.0f}"}</td>'
                   f'<td><span class="pill {vc}" style="font-size:11px;padding:2px 6px;border-width:1px">{vl}</span></td></tr>')
    top = [r for r in rows if r[3] is not None][:3]
    asof = stamp(snap["at"]) if snap else None
    title = "Forex Retail Sentiment Today: 28 pairs, crowd positioning and COT | QDB"
    desc = ("Free daily forex sentiment for the 28 major pairs: retail crowd % long, QDB Score and COT positioning, "
            "read the contrarian way. " + ("Most crowded today: " + ", ".join(f"{slash(r[1])} {r[3]}% long" for r in top) + "." if top else ""))
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "@id": url, "url": url, "name": title,
          "description": desc, "inLanguage": "en", "dateModified": (snap or {}).get("at", "")[:10] or None,
          "isPartOf": {"@type": "WebSite", "name": "QDB Trading Desk", "url": SITE + "/"},
          "hasPart": [{"@type": "WebPage", "url": f"{url}{p.lower()}/", "name": f"{slash(p)} sentiment"} for p in PAIRS]}
    upd = f'<span class="upd">Snapshot {e(asof)}</span>' if asof else '<span>First snapshot coming soon</span>'
    return head(title, desc, url, 1, ld, "Forex sentiment today: where the retail crowd is wrong") + f"""
<main class="wrap">
  <header class="hero">
    <p class="kick">Free · updated every weekday · no sign-up</p>
    <h1>Forex sentiment <em>today</em></h1>
    <p class="lead">The 28 major pairs: where the retail crowd stands, the QDB Score and the big speculators' COT positioning, read the contrarian way. Most crowded pairs first. <b>Only act at strong daily or weekly levels.</b></p>
    <p class="meta">{upd}<span>{sum(1 for r in rows if r[3] is not None)} pairs with crowd data</span></p>
  </header>
  <div class="card scroll">
    <table class="tbl">
      <thead><tr><th scope="col">Pair</th><th scope="col">Crowd</th><th scope="col">QDB Score</th><th scope="col" class="hide-sm">COT</th><th scope="col">Read</th></tr></thead>
      <tbody>
{chr(10).join(trs)}
      </tbody>
    </table>
  </div>
  <p class="muted small" style="margin-top:10px">Crowd: % of retail traders long. QDB Score: 0 to 12, 7+ bullish, 3 or less bearish. COT: base minus quote currency COT index, ±30 or more counts as a bias. "Members" means the crowd % for that pair is in the QDB Sheet.</p>
  <div class="cta" style="margin-top:24px">
    <h3>Once a day here. Every 15 minutes in the QDB Sheet.</h3>
    <p>Members get the live crowd for every pair, the Basket Shifting board, FXCM SSI and the MT5 Sentiment Delta indicator, plus Discord.</p>
    <div class="row"><a class="btn primary" href="../?ref=sentiment#pricing" data-goatcounter-click="sentiment-hub-pricing">See the QDB Sheet</a><a class="btn" href="../games/beat-the-crowd/?ref=sentiment">Play Beat the Crowd</a><a class="btn" href="../guides/retail-sentiment/?ref=sentiment">How to read the crowd</a></div>
  </div>
  <p class="foot">Crowd data: QDB Sheet daily snapshot. COT: CFTC Commitments of Traders. Educational only, not financial advice. <a href="../">Back to QDB Trading Desk</a></p>
</main>
</body>
</html>
"""


def update_sitemap(path, day):
    with open(path) as f:
        s = f.read()
    for u in [f"{SITE}/sentiment/"] + [f"{SITE}/sentiment/{p.lower()}/" for p in PAIRS]:
        entry = f"  <url><loc>{u}</loc><lastmod>{day}</lastmod></url>\n"
        pat = re.compile(r"  <url><loc>" + re.escape(u) + r"</loc>(<lastmod>[^<]*</lastmod>)?</url>\n")
        s = pat.sub(entry, s) if pat.search(s) else s.replace("</urlset>", entry + "</urlset>")
    with open(path, "w") as f:
        f.write(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--history", default="data/crowd-history.json")
    ap.add_argument("--cot", default="data/cot.json")
    ap.add_argument("--out", default="sentiment")
    ap.add_argument("--sitemap", default="sitemap.xml")
    ap.add_argument("--no-sitemap", action="store_true")
    a = ap.parse_args()
    hist = load(a.history, {}).get("snapshots", [])
    cot = load(a.cot, None)
    snap = hist[-1] if hist else None
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "index.html"), "w") as f:
        f.write(hub_page(snap, cot))
    for p in PAIRS:
        d = os.path.join(a.out, p.lower())
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w") as f:
            f.write(pair_page(p, snap, hist, cot))
    if not a.no_sitemap and os.path.exists(a.sitemap):
        update_sitemap(a.sitemap, (snap or {}).get("at", date.today().isoformat())[:10])
    print(f"Wrote {len(PAIRS)} pair pages and the hub to {a.out}/")


if __name__ == "__main__":
    main()
