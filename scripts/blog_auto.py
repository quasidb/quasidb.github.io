#!/usr/bin/env python3
"""Automated market notes for the QDB Blog (/blog/).

Each weekday morning (see .github/workflows/blog.yml):
  1. Research: Claude searches the web for the one fundamental story most
     likely to move currency sentiment for day traders today, and reads it.
  2. Draft: Claude turns its research into a structured note (JSON), or
     decides there's nothing worth writing and skips the day.
  3. Checks, in code: at least two sources, and every source URL must be one
     the web search actually returned. Crowd figures come from our own
     snapshot (data/crowd-history.json), never from the model.
  4. Publish: write blog/<slug>/index.html and update the blog index,
     the RSS feed and the sitemap. The workflow commits it.

    python3 scripts/blog_auto.py                 # research, draft, publish
    python3 scripts/blog_auto.py --dry-run       # research + draft, print, write nothing
    python3 scripts/blog_auto.py --fixture F.json --out /tmp/blog   # render a saved draft (no API)

Needs ANTHROPIC_API_KEY (repository secret) for the first two modes.
"""
import argparse
import html
import json
import os
import re
import sys
from datetime import datetime, timezone
from email.utils import format_datetime

SITE = "https://quasidb.com"
MODEL = "claude-opus-5-5"
PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
         "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD",
         "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
         "AUDJPY", "AUDCHF", "AUDCAD", "AUDNZD", "CADJPY", "CADCHF", "CHFJPY",
         "NZDJPY", "NZDCHF", "NZDCAD"]

EDITORIAL = """You write short market notes for the QDB Blog at quasidb.com, read by retail forex day traders.
QDB reads retail sentiment contrarian, but its one rule is: never trade sentiment on its own, only together with
technical and fundamental analysis and strict risk management. Trades happen only at strong weekly or daily
demand and supply levels.

Hard rules:
- Never invent facts, numbers, quotes, dates or levels. Every factual claim must come from a page you found with
  web search or read with web fetch today, and be attributed in the text ("according to Reuters", "ING said").
- Prefer primary and reputable sources: central banks, governments, statistics offices, Reuters, Bloomberg, BBC,
  FT, FXStreet, Pound Sterling Live, bank research notes. Avoid content farms and pages that just copy others.
- Correct the framing when headlines overstate a story (e.g. a "reset" reported as "rejoining").
- Quote levels only as other people's views, attributed. Never give trade signals, entries or targets of your own.
- Plain British English, short sentences, no hype, no em dashes. Calm and useful beats dramatic.
"""

RESEARCH_TASK = """Today is {today} (UTC). Find the ONE fundamental news story or scheduled event (today or in the last
24 hours) most likely to move currency sentiment for FX day traders: central bank decisions or speeches, major data
releases, politics that affects a currency, trade or geopolitical shocks.

Use web search, then web fetch the two to four best articles so you have the details right. Find out:
what happened or is scheduled (with times, UTC), the key facts and quotes, how the currency or currencies have
reacted so far, and any levels or views from named analysts or banks.

Recent posts on the blog (don't repeat a story unless there is genuinely new information):
{recent}

Finish with plain-text research notes: the story, the facts with the source of each, market reaction, analyst views,
what to watch next, and the full list of URLs you relied on. If nothing today is clearly worth a note, say so plainly."""

DRAFT_TASK = """Turn these research notes into a QDB Blog market note, or skip.

Research notes:
<notes>
{notes}
</notes>

URLs the research actually retrieved (sources MUST come from this list, copied exactly):
{urls}

Pairs we publish crowd data for: {pairs}

Rules for the JSON:
- publish=false (with skip_reason) if the story is thin, not currency-relevant, or a repeat. Skipping is fine.
- Text fields are plain text. You may use **double asterisks** for bold. No HTML, no links, no markdown headings.
- title: under 70 characters, factual, no clickbait. title_em: an optional second half shown in accent colour
  (the full headline reads title + ": " + title_em), or "".
- description: one sentence under 160 characters.
- tags: 1 to 4 currency or pair codes like "GBP" or "EUR/GBP".
- tldr: exactly 3 short bullets.
- sections: 3 to 5 sections, each with a heading and 1 to 3 short paragraphs, plus optional bullets. Cover what
  happened, how the market reacted, and what to watch next. Do NOT write a section on retail positioning or on how
  to trade it: those are added automatically from our own data and rules.
- levels: up to 3 levels named by sources, each value + label saying whose level it is. Empty list if none.
- crowd_pairs: up to 3 pair codes from the list above that the story affects most.
- sources: 2 to 6 entries; outlet, title, date (e.g. "23 Nov 2026") and url from the retrieved list."""

DRAFT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["publish", "skip_reason", "slug", "title", "title_em", "description", "tags", "tldr",
                 "sections", "levels", "crowd_pairs", "sources"],
    "properties": {
        "publish": {"type": "boolean"},
        "skip_reason": {"type": "string"},
        "slug": {"type": "string", "description": "lowercase-words-with-hyphens, under 60 characters"},
        "title": {"type": "string"},
        "title_em": {"type": "string"},
        "description": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "tldr": {"type": "array", "items": {"type": "string"}},
        "sections": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["heading", "paragraphs", "bullets"],
            "properties": {"heading": {"type": "string"},
                           "paragraphs": {"type": "array", "items": {"type": "string"}},
                           "bullets": {"type": "array", "items": {"type": "string"}}}}},
        "levels": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["value", "label"],
            "properties": {"value": {"type": "string"}, "label": {"type": "string"}}}},
        "crowd_pairs": {"type": "array", "items": {"type": "string"}},
        "sources": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["outlet", "title", "date", "url"],
            "properties": {"outlet": {"type": "string"}, "title": {"type": "string"},
                           "date": {"type": "string"}, "url": {"type": "string"}}}},
    },
}


# ---------- Claude ----------

def _client():
    import anthropic
    return anthropic.Anthropic()


def _call(client, **kw):
    # Server-side fallback: if the model declines, the API retries on a fallback model in the same call.
    return client.beta.messages.create(model=MODEL, betas=["server-side-fallback-2026-07-01"],
                                       fallbacks="default", **kw)


def _collect_urls(obj, out):
    """Walk a web search / web fetch result block and collect every url it holds."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "url" and isinstance(v, str) and v.startswith("http"):
                out.add(v)
            else:
                _collect_urls(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _collect_urls(v, out)


def research(client, today, recent):
    messages = [{"role": "user", "content": RESEARCH_TASK.format(today=today, recent=recent or "(none yet)")}]
    urls, resp = set(), None
    for _ in range(5):  # resume pause_turn a few times at most
        resp = _call(client, max_tokens=16000, system=EDITORIAL, messages=messages,
                     output_config={"effort": "high"},
                     tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 8},
                            {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 5}])
        for b in resp.content:
            if b.type in ("web_search_tool_result", "web_fetch_tool_result"):
                _collect_urls(b.model_dump(), urls)
        if resp.stop_reason != "pause_turn":
            break
        messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason == "refusal":
        raise SystemExit("Research was declined; no post today.")
    notes = "\n".join(b.text for b in resp.content if b.type == "text").strip()
    return notes, sorted(urls)


def draft(client, notes, urls):
    resp = _call(client, max_tokens=16000, system=EDITORIAL,
                 output_config={"effort": "high", "format": {"type": "json_schema", "schema": DRAFT_SCHEMA}},
                 messages=[{"role": "user", "content": DRAFT_TASK.format(
                     notes=notes, urls="\n".join(urls) or "(none)", pairs=", ".join(PAIRS))}])
    if resp.stop_reason != "end_turn":
        raise SystemExit(f"Draft did not finish ({resp.stop_reason}); no post today.")
    return json.loads(next(b.text for b in resp.content if b.type == "text"))


# ---------- checks ----------

def _norm(u):
    return u.split("#")[0].rstrip("/").lower()


def validate(d, urls, existing_slugs):
    """Return a list of problems; empty means the draft may be published."""
    errs = []
    seen = {_norm(u) for u in urls or []}
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", d["slug"]) or len(d["slug"]) > 60:
        errs.append(f"bad slug {d['slug']!r}")
    if d["slug"] in existing_slugs:
        errs.append(f"slug already used: {d['slug']}")
    if not d["title"].strip() or len(d["title"]) > 90:
        errs.append("title missing or too long")
    if not (1 <= len(d["description"]) <= 200):
        errs.append("description length")
    if len(d["tldr"]) != 3:
        errs.append("tldr must have 3 bullets")
    if not (2 <= len(d["sections"]) <= 6):
        errs.append("need 2 to 6 sections")
    if not (2 <= len(d["sources"]) <= 8):
        errs.append("need 2 to 8 sources")
    if urls is not None:
        for s in d["sources"]:
            if _norm(s["url"]) not in seen:
                errs.append(f"source not from today's research: {s['url']}")
    for s in d["sources"]:
        if not s["url"].startswith("https://"):
            errs.append(f"source must be https: {s['url']}")
    text = json.dumps(d)
    if re.search(r"<[a-zA-Z/]", text):
        errs.append("HTML found in text fields")
    if len(d["levels"]) > 3 or len(d["crowd_pairs"]) > 3:
        errs.append("too many levels or crowd pairs")
    return errs


# ---------- rendering ----------

def inline(s):
    """Plain text -> safe HTML; **bold** becomes <b>."""
    s = html.escape(s.strip(), quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)


def attr(s):
    return html.escape(s.strip(), quote=True)


def plain(s):
    return s.replace("**", "").strip()


def pair_label(p):
    return f"{p[:3]}/{p[3:]}"


def crowd_section(pairs, snaps):
    """Built only from our own snapshot data; returns '' if we have nothing to show."""
    if not snaps:
        return ""
    last = snaps[-1]
    rows = []
    for p in pairs:
        p = p.replace("/", "").upper()
        if p not in PAIRS:
            continue
        cur = (last.get("pairs") or {}).get(p) or {}
        link = f'<a href="../../sentiment/{p.lower()}/?ref=blog-auto">{pair_label(p)} page</a>'
        if "long" in cur:
            lng = cur["long"]
            side = "long" if lng >= 50 else "short"
            pct = lng if lng >= 50 else 100 - lng
            rows.append(f"<li><b>{pair_label(p)}:</b> {pct:.0f}% of retail traders {side}"
                        f" (QDB Score {cur.get('score', '?')}/12). {link}</li>")
        elif "score" in cur:
            rows.append(f"<li><b>{pair_label(p)}:</b> QDB Score {cur['score']}/12. {link}</li>")
    if not rows:
        return ""
    when = datetime.strptime(last["date"], "%Y-%m-%d").strftime("%-d %b %Y")
    return f"""
  <section class="sec" id="crowd">
    <h2>Where the retail crowd sits</h2>
    <p>From the QDB daily crowd snapshot of {when}:</p>
    <ul class="plain">
      {"".join(rows)}
    </ul>
    <p>Read contrarian, a lopsided crowd is <b>fuel, not a signal</b>. It can stay lopsided for days, and on its own it says nothing about <b>where</b> to trade.</p>
  </section>"""


HOW_TO_TRADE = """
  <section class="sec" id="trade">
    <h2>How to use this as a day trader</h2>
    <p>News is the <b>kitchen</b>, not the cake: it sets the backdrop and tells you when to stay out of the oven.</p>
    <ul class="plain">
      <li><b>Risk first.</b> Decide your size and maximum loss before the news, not during it. Spreads can widen around events.</li>
      <li><b>Levels second.</b> Only trade at strong weekly or daily demand and supply. Check any levels quoted above against your own chart.</li>
      <li><b>Crowd last.</b> At a level, check whether the crowd is against your trade (go) or with it (skip, or size down).</li>
      <li><b>No level, no trade.</b> A headline in the middle of a range is a coin flip.</li>
    </ul>
    <div class="note gold"><h4>The one rule</h4><p>Never trade sentiment on its own. Use it only alongside technical and fundamental analysis, with strict <b>risk management</b>. The full method is in <a href="../../guides/sentiment-in-a-system/?ref=blog-auto">Sentiment: the final layer of any trading system</a>.</p></div>
  </section>"""


def render_post(d, now, snaps):
    title_full = d["title"].strip() + (": " + d["title_em"].strip() if d["title_em"].strip() else "")
    h1 = inline(d["title"]) + (f": <em>{inline(d['title_em'])}</em>" if d["title_em"].strip() else "")
    slug = d["slug"]
    url = f"{SITE}/blog/{slug}/"
    iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    day = now.strftime("%A %-d %B %Y")
    kick = " · ".join(["Market note"] + [inline(t) for t in d["tags"][:4]])
    secs = []
    for s in d["sections"]:
        body = "".join(f"\n    <p>{inline(p)}</p>" for p in s["paragraphs"])
        if s["bullets"]:
            body += "\n    <ul class=\"plain\">" + "".join(f"<li>{inline(b)}</li>" for b in s["bullets"]) + "</ul>"
        secs.append(f"\n  <section class=\"sec\">\n    <h2>{inline(s['heading'])}</h2>{body}\n  </section>")
    levels = ""
    if d["levels"]:
        cells = "".join(f"<div><b>{inline(l['value'])}</b><span>{inline(l['label'])}</span></div>" for l in d["levels"])
        levels = f"""
  <section class="sec" id="levels">
    <h2>Levels named by the sources</h2>
    <div class="lvl">{cells}</div>
    <p class="muted" style="font-size:15px">Other people's levels, quoted for context. Mark your own from the weekly and daily charts.</p>
  </section>"""
    srcs = "".join(
        f'\n      <li>{inline(s["outlet"])}, "{inline(s["title"])}", {inline(s["date"])}. '
        f'<a href="{attr(s["url"])}" rel="noopener nofollow" target="_blank">Read</a></li>' for s in d["sources"])
    ld = json.dumps({"@context": "https://schema.org", "@type": "NewsArticle", "headline": title_full[:110],
                     "datePublished": iso, "author": {"@type": "Organization", "name": "QDB Trading Desk"},
                     "publisher": {"@type": "Organization", "name": "QDB Trading Desk",
                                   "logo": {"@type": "ImageObject", "url": f"{SITE}/logo.png"}},
                     "image": f"{SITE}/og-image.png", "mainEntityOfPage": url}, ensure_ascii=False)
    tldr = "".join(f"<li>{inline(t)}</li>" for t in d["tldr"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{attr(plain(title_full))} | QDB Blog</title>
<meta name="description" content="{attr(plain(d['description']))}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="QDB Trading Desk">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{attr(plain(title_full))}">
<meta property="og:description" content="{attr(plain(d['description']))}">
<meta property="og:image" content="{SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="article:published_time" content="{iso}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{attr(plain(title_full))}">
<meta name="twitter:description" content="{attr(plain(d['description']))}">
<meta name="twitter:image" content="{SITE}/og-image.png">
<meta name="theme-color" content="#0b0f17">
<link rel="icon" href="../../logo.png">
<link rel="alternate" type="application/rss+xml" title="QDB Blog" href="../feed.xml">
<script data-goatcounter="https://quasidb.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../guides/guides.css">
<link rel="stylesheet" href="../blog.css">
<script type="application/ld+json">{ld.replace("</", "<\\/")}</script>
</head>
<body>
<!-- Generated by scripts/blog_auto.py on {iso}. -->
<nav class="top"><div class="wrap">
  <a class="brand" href="../../?ref=blog"><img src="../../logo.png" alt="">QDB Trading Desk</a>
  <div class="navl"><a href="../" aria-current="page">Blog</a><a href="../../guides/?ref=blog">Guides</a><a href="../../sentiment/?ref=blog">Sentiment</a><a href="../../?ref=blog#pricing">Pricing</a></div>
</div></nav>
<main class="wrap">
<article class="post">
  <header class="hero">
    <p class="kick">{kick}</p>
    <h1>{h1}</h1>
    <p class="meta">{day} · automated market note</p>
    <div class="tldr">
      <h4>In short</h4>
      <ul>{tldr}</ul>
    </div>
  </header>
{"".join(secs)}{levels}{crowd_section(d["crowd_pairs"], snaps)}{HOW_TO_TRADE}

  <section class="sec" id="sources">
    <h2>Sources</h2>
    <ol class="src">{srcs}
    </ol>
  </section>

  <p class="foot">This note was researched and drafted automatically by AI from the sources listed above, and published without a manual check. Quotes and views belong to those sources. Spot a mistake? <a href="../../?ref=blog-auto#contact">Tell us</a>. Educational only, not financial advice. Trading on margin carries a high level of risk and the majority of retail CFD accounts lose money. <a href="../">All posts</a> · <a href="../feed.xml">RSS</a></p>
</article>
</main>
</body>
</html>
"""


def add_to_index(path, d, now, kind="market"):
    with open(path) as f:
        s = f.read()
    tags = " · ".join(attr(t) for t in d["tags"][:2])
    title_full = plain(d["title"]) + (": " + plain(d["title_em"]) if d["title_em"].strip() else "")
    label = "Site update" if kind == "site" else "Market note"
    card = (f'\n    <a class="pitem" data-type="{kind}" href="{d["slug"]}/">\n'
            f'      <span class="k"><span class="t">{label}</span> · {now.strftime("%-d %b %Y")}'
            f'{" · " + tags if tags else ""}</span>\n'
            f'      <h3>{attr(title_full)}</h3>\n'
            f'      <p>{attr(plain(d["description"]))}</p>\n    </a>')
    marker = '<div class="plist" id="posts">'
    if marker not in s:
        raise SystemExit("blog/index.html: post list marker not found")
    with open(path, "w") as f:
        f.write(s.replace(marker, marker + card, 1))


def add_to_feed(path, d, now, kind="market"):
    with open(path) as f:
        s = f.read()
    title_full = plain(d["title"]) + (": " + plain(d["title_em"]) if d["title_em"].strip() else "")
    url = f"{SITE}/blog/{d['slug']}/"
    item = (f"\n  <item>\n    <title>{html.escape(title_full)}</title>\n    <link>{url}</link>\n"
            f"    <guid>{url}</guid>\n    <pubDate>{format_datetime(now, usegmt=True)}</pubDate>\n"
            f"    <category>{'Site update' if kind == 'site' else 'Market note'}</category>\n    <description>{html.escape(plain(d['description']))}</description>\n  </item>")
    marker = "</language>"
    with open(path, "w") as f:
        f.write(s.replace(marker, marker + item, 1))


def add_to_sitemap(path, slug, day):
    with open(path) as f:
        s = f.read()
    entry = f"  <url><loc>{SITE}/blog/{slug}/</loc><lastmod>{day}</lastmod></url>\n"
    s = re.sub(r"(  <url><loc>" + re.escape(SITE + "/blog/") + r"</loc>)<lastmod>[^<]*</lastmod>",
               r"\1<lastmod>" + day + "</lastmod>", s)
    blog = f"  <url><loc>{SITE}/blog/</loc>"
    i = s.find(blog)
    if i >= 0:
        j = s.index("\n", i) + 1
        s = s[:j] + entry + s[j:]
    else:
        s = s.replace("</urlset>", entry + "</urlset>")
    with open(path, "w") as f:
        f.write(s)


def recent_titles(index_path, n=10):
    try:
        s = open(index_path).read()
    except OSError:
        return ""
    return "\n".join("- " + html.unescape(t) for t in re.findall(r"<h3>(.*?)</h3>", s)[:n])


def existing_slugs(blog_dir):
    return {e for e in os.listdir(blog_dir) if os.path.isdir(os.path.join(blog_dir, e))}


def load_snaps(path):
    try:
        return json.load(open(path)).get("snapshots") or []
    except (OSError, ValueError):
        return []


def publish(d, blog_dir, sitemap, snaps, now):
    os.makedirs(os.path.join(blog_dir, d["slug"]), exist_ok=False)
    with open(os.path.join(blog_dir, d["slug"], "index.html"), "w") as f:
        f.write(render_post(d, now, snaps))
    add_to_index(os.path.join(blog_dir, "index.html"), d, now)
    add_to_feed(os.path.join(blog_dir, "feed.xml"), d, now)
    if sitemap and os.path.exists(sitemap):
        add_to_sitemap(sitemap, d["slug"], now.strftime("%Y-%m-%d"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--blog", default="blog")
    ap.add_argument("--sitemap", default="sitemap.xml")
    ap.add_argument("--history", default="data/crowd-history.json")
    ap.add_argument("--dry-run", action="store_true", help="research and draft, but write nothing")
    ap.add_argument("--fixture", help="render a saved draft JSON instead of calling the API")
    ap.add_argument("--out", help="with --fixture: copy of the blog folder to write into")
    a = ap.parse_args()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    snaps = load_snaps(a.history)

    if a.fixture:
        import shutil
        d = json.load(open(a.fixture))
        out = a.out or "/tmp/blog-fixture"
        shutil.rmtree(out, ignore_errors=True)
        shutil.copytree(a.blog, out)
        errs = validate(d, None, existing_slugs(out))
        if errs:
            sys.exit("Fixture failed checks:\n- " + "\n- ".join(errs))
        publish(d, out, None, snaps, now)
        print(f"Rendered {out}/{d['slug']}/index.html")
        return

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set; skipping the market note.")
        return
    client = _client()
    notes, urls = research(client, now.strftime("%A %-d %B %Y"), recent_titles(os.path.join(a.blog, "index.html")))
    print(f"Research done: {len(urls)} URLs retrieved.")
    d = draft(client, notes, urls)
    if not d.get("publish"):
        print("Skipped today:", d.get("skip_reason") or "(no reason given)")
        return
    errs = validate(d, urls, existing_slugs(a.blog))
    if errs:
        print("Draft failed checks, nothing published:\n- " + "\n- ".join(errs))
        print(json.dumps(d, indent=2))
        return
    if a.dry_run:
        print(json.dumps(d, indent=2))
        return
    publish(d, a.blog, a.sitemap, snaps, now)
    print(f"Published blog/{d['slug']}/")


if __name__ == "__main__":
    main()
