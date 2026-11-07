#!/usr/bin/env python3
"""Build the static weekly COT page (cot/index.html) from data/cot.json.

The page is written as plain HTML, numbers included, so search engines and
link previews (X, Telegram, Discord) see this week's figures without running
any JavaScript. The COT workflow runs this right after scripts/cot.py.

    python3 scripts/cot_page.py                # writes cot/index.html, bumps sitemap lastmod
    python3 scripts/cot_page.py --data x.json --out /tmp/cot.html --no-sitemap
"""
import argparse
import html
import json
import os
import re
import urllib.parse
from datetime import date

SITE = "https://quasidb.com"
URL = SITE + "/cot/"
LABEL = {"XAU": "Gold", "XAG": "Silver"}
EXT_HI, EXT_LO = 90, 10

e = html.escape


def nice_date(iso):
    d = date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%b %Y')}"


def long_date(iso):
    d = date.fromisoformat(iso)
    return f"{d.strftime('%A')} {d.day} {d.strftime('%B %Y')}"


def name_of(sym, m):
    return LABEL.get(sym, sym)


def fmt_num(n):
    return ("+" if n > 0 else "") + f"{n:,}".replace("-", "−")


def fmt_usd(n):
    s = "+" if n > 0 else "−" if n < 0 else ""
    return f"{s}${abs(n) / 1e9:.1f}bn"


def is_ext(idx):
    return idx >= EXT_HI or idx <= EXT_LO


def spark(hist, w=96, h=26):
    """Tiny inline SVG of the last 26 weeks' net position, with a zero line."""
    if not hist or len(hist) < 2:
        return ""
    lo, hi = min(hist + [0]), max(hist + [0])
    rng = (hi - lo) or 1
    pts = []
    for i, v in enumerate(hist):
        x = i / (len(hist) - 1) * (w - 2) + 1
        y = h - 2 - (v - lo) / rng * (h - 4)
        pts.append(f"{x:.1f},{y:.1f}")
    zy = h - 2 - (0 - lo) / rng * (h - 4)
    col = "var(--buy)" if hist[-1] >= 0 else "var(--sell)"
    return (f'<svg class="spark" viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true">'
            f'<line x1="0" x2="{w}" y1="{zy:.1f}" y2="{zy:.1f}" class="zero"/>'
            f'<polyline points="{" ".join(pts)}" fill="none" stroke="{col}" stroke-width="1.6" '
            f'stroke-linejoin="round" stroke-linecap="round"/></svg>')


def headlines(d):
    """Plain-English bullet points, worked out from the numbers."""
    allm = {**d["currencies"], **d["metals"]}
    out = []

    ext = sorted(((s, m) for s, m in allm.items() if is_ext(m["index"])),
                 key=lambda sm: abs(sm[1]["index"] - 50), reverse=True)
    for s, m in ext[:4]:
        side = "long" if m["index"] >= 50 else "short"
        most = "most" if m["index"] in (0, 100) else "near their most"
        out.append(f"<b>{e(name_of(s, m))}</b>: speculators are {most} {side} in 3 years "
                   f"(COT index {round(m['index'])}). A crowded trade, so watch for it to unwind.")

    movers = [(s, m) for s, m in allm.items()
              if m.get("chg") is not None and m.get("oi") and not m.get("unit")]
    if movers:
        s, m = max(movers, key=lambda sm: abs(sm[1]["chg"]) / sm[1]["oi"])
        verb = "added" if m["chg"] > 0 else "cut"
        out.append(f"Biggest weekly shift: <b>{e(name_of(s, m))}</b>, where speculators {verb} "
                   f"{abs(m['chg']):,} net long contracts.")

    if "XAU" in allm and not any(s == "XAU" for s, _ in ext[:4]):
        g = allm["XAU"]
        lean = "net long" if (g.get("net") or 0) >= 0 else "net short"
        out.append(f"<b>Gold</b>: speculators stay {lean} ({g['long_pct']}% of positions long), "
                   f"with the COT index at {round(g['index'])} of 100.")

    pairs = d.get("pairs") or []
    if len(pairs) >= 4:
        top = ", ".join(p["pair"][:3] + "/" + p["pair"][3:] for p in pairs[:2])
        bot = ", ".join(p["pair"][:3] + "/" + p["pair"][3:] for p in pairs[-2:])
        out.append(f"Strongest speculator bias among the 28 pairs: <b>{top}</b> to the upside, "
                   f"<b>{bot}</b> to the downside.")
    return out


def share_text(d):
    allm = {**d["currencies"], **d["metals"]}
    ext = [name_of(s, m) for s, m in allm.items() if is_ext(m["index"])]
    bits = f" Extremes: {', '.join(ext[:3])}." if ext else ""
    return (f"This week's COT report in plain English (positions on {nice_date(d['report_date'])})."
            f"{bits} Big speculators across FX, Gold and Silver:")


def market_rows(d):
    rows = []
    for s, m in {**d["currencies"], **d["metals"]}.items():
        f = fmt_usd if m.get("unit") == "USD" else fmt_num
        sub = "" if s in LABEL else f"<small>{e(m['name'])}</small>"
        if m.get("net") is None:
            net = '<td>—</td><td class="hide-sm">—</td><td class="hide-sm">—</td><td class="hide-sm"></td>'
        else:
            net = (f'<td class="{"buy" if m["net"] >= 0 else "sell"}">{f(m["net"])}</td>'
                   f'<td class="hide-sm {"buy" if m["chg"] >= 0 else "sell"}">{f(m["chg"])}</td>'
                   f'<td class="hide-sm">{m["long_pct"]}%</td>'
                   f'<td class="hide-sm">{spark(m.get("history"))}</td>')
        idx = m["index"]
        flag = '<span class="ext">EXT</span>' if is_ext(idx) else ""
        rows.append(
            f'<tr><th scope="row">{e(name_of(s, m))}{sub}</th>{net}'
            f'<td><div class="idx"><b>{round(idx)}</b><div class="bar" role="img" '
            f'aria-label="COT index {round(idx)} of 100"><i style="left:{idx}%"></i></div>'
            f'<span>{flag}</span></div></td></tr>')
    return "\n".join(rows)


def pair_cells(d):
    out = []
    for p in d.get("pairs") or []:
        sc = p["score"]
        a = min(abs(sc) / 100, 1) * .55 + .05
        c = "34,197,94" if sc >= 0 else "239,68,68"
        nm = p["pair"][:3] + "/" + p["pair"][3:]
        out.append(f'<a class="pair" href="../sentiment/{p["pair"].lower()}/?ref=cot" style="background:rgba({c},{a:.2f})">'
                   f'<span>{nm}</span><b>{fmt_num(round(sc))}</b></a>')
    return "\n".join(out)


def render(d):
    rd = d["report_date"]
    nd = nice_date(rd)
    allm = {**d["currencies"], **d["metals"]}
    ext = [name_of(s, m) for s, m in allm.items() if is_ext(m["index"])]
    title = f"COT Report This Week ({nd}): FX, Gold & Silver Positioning | QDB"
    desc = (f"This week's CFTC Commitments of Traders report in plain English, positions on {nd}. "
            + (f"3-year extremes in {', '.join(ext[:3])}. " if ext else "")
            + "Net speculator positioning for 8 currencies, Gold, Silver and 28 FX pairs, updated every Friday.")
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebPage", "@id": URL, "url": URL, "name": title, "description": desc,
             "dateModified": d.get("updated", rd)[:10], "inLanguage": "en",
             "isPartOf": {"@type": "WebSite", "name": "QDB Trading Desk", "url": SITE + "/"}},
            {"@type": "Dataset", "name": "Weekly COT positioning: FX majors, Gold and Silver",
             "description": "Net non-commercial (large speculator) positioning from the CFTC Commitments of "
                            "Traders report, with a 3-year COT index for each market and a score for the 28 FX pairs.",
             "url": URL, "temporalCoverage": rd, "dateModified": d.get("updated", rd)[:10],
             "isBasedOn": "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm",
             "creator": {"@type": "Organization", "name": "QDB Trading Desk", "url": SITE + "/"},
             "distribution": [
                 {"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": SITE + "/data/cot.json"},
                 {"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": SITE + "/data/cot-markets.csv"},
                 {"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": SITE + "/data/cot-pairs.csv"}]},
        ],
    }
    share = "https://x.com/intent/post?" + urllib.parse.urlencode(
        {"text": share_text(d), "url": URL + "?ref=x-share"})
    bullets = "\n".join(f"      <li>{b}</li>" for b in headlines(d))
    stale = ""
    if d.get("stale"):
        stale = (f'<p class="muted small">Not yet updated this week: {", ".join(e(s) for s in d["stale"])} '
                 f'(the CFTC publishes late after US holidays).</p>')

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Generated by scripts/cot_page.py from data/cot.json. Edit the script, not this file. -->
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{URL}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="QDB Trading Desk">
<meta property="og:url" content="{URL}">
<meta property="og:title" content="COT report this week: positions on {e(nd)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="COT report this week: positions on {e(nd)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE}/og-image.png">
<meta name="theme-color" content="#0b0f17">
<link rel="icon" href="../logo.png">
<script type="application/ld+json">{json.dumps(ld, separators=(",", ":"))}</script>
<script data-goatcounter="https://quasidb.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../guides/guides.css">
<style>
.small{{font-size:15px}}
.meta{{display:flex;flex-wrap:wrap;gap:6px 14px;font-family:var(--mono);font-size:14px;color:var(--muted);margin-top:14px}}
.meta .upd{{color:var(--buy);font-weight:600}}
.meta .upd::before{{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--buy);margin-right:7px;vertical-align:1px}}
.heads{{list-style:none;display:grid;gap:10px;margin-top:6px;max-width:48em}}
.heads li{{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:0 12px 12px 0;padding:12px 16px;color:var(--muted)}}
.heads li b{{color:var(--text)}}
.tbl{{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:15px}}
.tbl th,.tbl td{{padding:10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}}
.tbl thead th{{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);font-weight:600}}
.tbl th:first-child,.tbl td:first-child{{text-align:left}}
.tbl tbody th{{font-weight:700}}
.tbl tbody th small{{display:block;font-family:var(--sans);font-weight:400;font-size:12px;color:var(--dim)}}
.buy{{color:var(--buy)}} .sell{{color:var(--sell)}}
.spark{{display:block;margin-left:auto}} .spark .zero{{stroke:var(--line);stroke-dasharray:2 3}}
.idx{{display:grid;grid-template-columns:28px minmax(70px,120px) 38px;align-items:center;justify-content:end;gap:10px}}
.bar{{position:relative;height:8px;border-radius:4px;background:linear-gradient(90deg,rgba(239,68,68,.35),rgba(147,160,184,.12) 50%,rgba(34,197,94,.35))}}
.bar i{{position:absolute;top:-4px;width:4px;height:16px;border-radius:2px;margin-left:-2px;background:var(--text)}}
.ext{{font-size:11px;font-weight:700;color:var(--accent);border:1px solid var(--accent);border-radius:4px;padding:1px 4px}}
.scroll{{overflow-x:auto;-webkit-overflow-scrolling:touch}}
.pairs{{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;margin-top:14px}}
.pair{{color:var(--text);text-decoration:none;display:flex;justify-content:space-between;gap:6px;border-radius:10px;padding:9px 11px;font-family:var(--mono);font-size:14px;border:1px solid rgba(255,255,255,.05)}}
.faq details{{border-bottom:1px solid var(--line);padding:12px 0;max-width:48em}}
.faq summary{{cursor:pointer;font-weight:600}}
.faq p{{color:var(--muted);margin-top:8px}}
.btn.x{{background:#000;border-color:#333;color:#fff}}
@media (max-width:640px){{.hide-sm{{display:none}} .tbl{{font-size:14px}} .tbl th,.tbl td{{padding:9px 6px}} .idx{{grid-template-columns:22px 48px 30px;gap:5px}} .card.scroll{{padding:8px}} .tbl tbody th small{{display:none}} .ext{{font-size:10px;padding:1px 3px}}}}
</style>
</head>
<body>
<nav class="top"><div class="wrap">
  <a class="brand" href="../?ref=cot"><img src="../logo.png" alt="">QDB Trading Desk</a>
  <div class="navl"><a href="./" aria-current="page">COT</a><a href="../guides/?ref=cot">Guides</a><a href="../games/?ref=cot">Games</a><a href="../sentiment/?ref=cot">Sentiment</a><a href="../downloads/?ref=cot">Downloads</a><a href="../?ref=cot#pricing">Pricing</a></div>
</div></nav>

<main class="wrap">
  <header class="hero">
    <p class="kick">Free · updated every Friday · no sign-up</p>
    <h1>COT report <em>this week</em></h1>
    <p class="lead">What the big speculators (hedge funds and other large traders) are holding in FX futures, Gold and Silver, from the CFTC Commitments of Traders report. Explained in plain English, with one rule: <b>only act on it at strong technical levels.</b></p>
    <p class="meta"><span class="upd">Positions on {e(long_date(rd))}</span><span>Released by the CFTC on the Friday after</span><span>3-year look-back</span></p>
  </header>

  <section class="sec" id="headlines">
    <h2>This week in plain English</h2>
    <ul class="heads">
{bullets}
    </ul>
    {stale}
    <div class="row"><a class="btn primary" href="https://www.youtube.com/@quasidb" target="_blank" rel="noopener" data-goatcounter-click="cot-page-youtube">Watch the weekend COT breakdown</a><a class="btn x" href="{e(share)}" target="_blank" rel="noopener" data-goatcounter-click="cot-page-share-x">Share on X</a></div>
  </section>

  <section class="sec" id="markets">
    <h2>Net positioning by market</h2>
    <p class="muted">Net contracts held by non-commercials (large speculators). The COT index shows where this week's net position sits in its 3-year range, from 0 (most short) to 100 (most long). <span class="ext">EXT</span> marks a 3-year extreme. The line shows the last 26 weeks.</p>
    <div class="card scroll" style="margin-top:14px">
      <table class="tbl">
        <thead><tr><th scope="col">Market</th><th scope="col">Net</th><th scope="col" class="hide-sm">Week</th><th scope="col" class="hide-sm">% long</th><th scope="col" class="hide-sm">26 weeks</th><th scope="col">COT index</th></tr></thead>
        <tbody>
{market_rows(d)}
        </tbody>
      </table>
    </div>
    <p class="muted small" style="margin-top:10px">USD has no clean futures contract, so it is built from the seven majors and shown in US dollars.</p>
  </section>

  <section class="sec" id="pairs">
    <h2>The 28 pairs, ranked</h2>
    <p class="muted">Tap a pair for its daily sentiment page. Base currency index minus quote currency index. Green means speculators back the base currency over the quote, red the other way round. Strongest bias first.</p>
    <div class="pairs">
{pair_cells(d)}
    </div>
  </section>

  <section class="sec faq" id="faq">
    <h2>COT report questions</h2>
    <details open><summary>What is the COT report?</summary><p>The Commitments of Traders report is published every week by the US Commodity Futures Trading Commission (CFTC). It shows how different groups of traders are positioned in US futures markets. This page uses the non-commercial group, the large speculators such as hedge funds, because they tend to ride trends.</p></details>
    <details><summary>When is the COT report released?</summary><p>Every Friday at 3:30pm US Eastern time, covering positions as of the Tuesday before. After a US public holiday it can come out a day or two late. This page updates automatically soon after each release.</p></details>
    <details><summary>What is the COT index?</summary><p>It places this week's net position in its range over the last three years: 0 is the most short speculators have been in that time, 100 the most long. Readings of 10 or below, or 90 or above, are flagged as extremes, where the trade is crowded and more likely to unwind.</p></details>
    <details><summary>How should I trade with it?</summary><p>Not on its own. COT is slow, weekly data that tells you which way the big money leans. Use it to pick a side, then wait for price to reach a strong daily or weekly supply or demand level before you act. QDB pairs it with retail sentiment for that reason: when the crowd and the speculators disagree at a key level, that is where the best setups appear.</p></details>
    <details><summary>Can I use this data in my own sheet?</summary><p>Yes. The numbers are free as <a href="../data/cot-markets.csv">markets CSV</a>, <a href="../data/cot-pairs.csv">pairs CSV</a> and <a href="../data/cot.json">JSON</a>. In Google Sheets, use <code>=IMPORTDATA("{SITE}/data/cot-markets.csv")</code>.</p></details>
  </section>

  <div class="cta">
    <h3>COT is the slow picture. Retail sentiment is the fast one.</h3>
    <p>QDB tracks what retail traders are doing hour by hour, and scores every setup against strong technical levels. See how the two fit together.</p>
    <div class="row"><a class="btn primary" href="../?ref=cot#pricing">See what QDB includes</a><a class="btn" href="../guides/retail-sentiment/?ref=cot">Read the retail sentiment guide</a><a class="btn" href="https://t.me/quasidb" target="_blank" rel="noopener" data-goatcounter-click="cot-page-telegram">Follow on Telegram</a></div>
  </div>

  <p class="foot">Source: CFTC Commitments of Traders, Legacy futures-only report. Educational only, not financial advice. Trading on margin carries a high level of risk. <a href="../">Back to QDB Trading Desk</a></p>
</main>
</body>
</html>
"""


def bump_sitemap(path, day):
    with open(path) as f:
        s = f.read()
    entry = f"  <url><loc>{URL}</loc><lastmod>{day}</lastmod></url>\n"
    pat = re.compile(r"  <url><loc>" + re.escape(URL) + r"</loc><lastmod>[^<]*</lastmod></url>\n")
    if pat.search(s):
        s = pat.sub(entry, s)
    else:
        s = s.replace("</urlset>", entry + "</urlset>")
    with open(path, "w") as f:
        f.write(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/cot.json")
    ap.add_argument("--out", default="cot/index.html")
    ap.add_argument("--sitemap", default="sitemap.xml")
    ap.add_argument("--no-sitemap", action="store_true")
    a = ap.parse_args()
    with open(a.data) as f:
        d = json.load(f)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w") as f:
        f.write(render(d))
    if not a.no_sitemap and os.path.exists(a.sitemap):
        bump_sitemap(a.sitemap, d.get("updated", d["report_date"])[:10])
    print(f"wrote {a.out} for report {d['report_date']}")


if __name__ == "__main__":
    main()
