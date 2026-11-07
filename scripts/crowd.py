#!/usr/bin/env python3
"""Daily retail-crowd snapshot and the "Beat the Crowd" daily puzzle.

Once each weekday afternoon (after the ECB reference rates are out) this:
  1. reads the crowd's % long per pair from the QDB Sheet's published ticker tab,
     and the QDB Score per pair from the published scores tab;
  2. reads the day's ECB reference rates (frankfurter) so a price move can be
     measured from one snapshot to the next;
  3. appends the snapshot to data/crowd-history.json (rolling, about six months);
  4. builds data/daily.json: today's puzzle of five pairs, each showing where the
     crowd stood at the previous snapshot and how price moved since.

The puzzle needs two snapshots, so the first one appears on the second run.
Standard library only.

Run: python3 scripts/crowd.py [--check]   (--check prints what it read and writes nothing)
"""
import argparse
import csv
import io
import json
import os
import random
import re
import sys
import urllib.request
from datetime import datetime, timezone

SHEET = ("https://docs.google.com/spreadsheets/d/e/2PACX-1vQH6tE-4tM3gxk5G5OBIbDA7Z3bRwDYQYu4nESCDyD2QrE4DUKJJREGd"
         "lENvfCHxnh4xeuBsXYH2mv_/pub?single=true&output=csv&gid=")
TICKER_GID, SCORES_GID = "0", "1001"
RATES = ["https://api.frankfurter.app/latest?from=EUR", "https://api.frankfurter.dev/v1/latest?base=EUR"]
HISTORY, DAILY = "data/crowd-history.json", "data/daily.json"
KEEP = 130          # snapshots kept (about six months of weekdays)
ROUNDS = 5          # pairs per puzzle
POOL = 10           # pick the puzzle from the 10 pairs where the crowd leaned hardest
UA = {"User-Agent": "qdb-crowd/1.0"}


def get(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def num(v):
    try:
        return float(str(v).replace("%", "").replace(",", "").replace("+", "").replace("−", "-").strip())
    except ValueError:
        return None


def sym(v):
    """'EUR/USD', 'eurusd ', 'EURUSD.a' -> 'EURUSD'. Returns '' for anything that isn't a symbol."""
    s = re.sub(r"[^A-Za-z0-9]", "", str(v or "")).upper()
    return s if 5 <= len(s) <= 8 and not s.isdigit() else ""


def read_crowd():
    """{SYM: {'long': %, 'score': 0-12 or None, 'dc': %, 'wc': %}}"""
    out = {}
    for r in csv.reader(io.StringIO(get(SHEET + TICKER_GID))):
        s = sym(r[0] if r else "")
        pct = num(r[1]) if len(r) > 1 else None
        if not s or pct is None:
            continue
        if abs(pct) <= 1:          # 0.26 as well as 26 / 26%
            pct *= 100
        if 0 <= pct <= 100:
            out[s] = {"long": round(pct, 1)}
    try:
        for r in csv.reader(io.StringIO(get(SHEET + SCORES_GID))):
            s = sym(r[0] if r else "")
            sc = num(r[1]) if len(r) > 1 else None
            if not s or sc is None:
                continue
            d = out.setdefault(s, {})
            d["score"] = round(sc)
            if len(r) > 2 and num(r[2]) is not None:
                d["dc"] = round(num(r[2]), 3)
            if len(r) > 3 and num(r[3]) is not None:
                d["wc"] = round(num(r[3]), 3)
    except Exception as e:  # noqa: BLE001 - scores are a bonus; the crowd % is what matters
        print("Scores tab not read:", e)
    return out


def read_rates():
    for u in RATES:
        try:
            d = json.loads(get(u))
            rates = {k: float(v) for k, v in d["rates"].items()}
            rates["EUR"] = 1.0
            return d["date"], rates
        except Exception as e:  # noqa: BLE001
            print("Rates not read from", u, e)
    return None, {}


def price(s, rates):
    """Price of a 6-letter FX pair from EUR-based rates, or None."""
    if len(s) != 6:
        return None
    b, q = s[:3], s[3:]
    if b in rates and q in rates:
        return rates[q] / rates[b]
    return None


def lean(long_pct):
    return abs(long_pct - 50)


def build_puzzle(prev, cur, n):
    """Five rounds: where the crowd stood at `prev`, and how price moved by `cur`."""
    if not prev.get("rates") or not cur.get("rates") or prev.get("rates_date") == cur.get("rates_date"):
        return None
    pool = []
    for s, c in prev["pairs"].items():
        if "long" not in c:
            continue
        p0, p1 = price(s, prev["rates"]), price(s, cur["rates"])
        if p0 is None or p1 is None:
            continue
        move = (p1 / p0 - 1) * 100
        if abs(move) < 0.02:       # too flat to call
            continue
        pool.append((lean(c["long"]), s, c, p0, p1, move))
    if len(pool) < ROUNDS:
        return None
    pool.sort(key=lambda x: (-x[0], x[1]))
    pick = pool[:POOL]
    random.Random(cur["date"]).shuffle(pick)
    dp = lambda s: 3 if s.endswith("JPY") else 5   # noqa: E731
    rounds = [{
        "sym": s,
        "long": c["long"],
        "score": c.get("score"),
        "p0": round(p0, dp(s)),
        "p1": round(p1, dp(s)),
        "move": round(move, 2),
    } for _, s, c, p0, p1, move in pick[:ROUNDS]]
    return {"n": n, "date": cur["date"], "from": prev["date"], "to": cur["date"],
            "from_rates": prev["rates_date"], "to_rates": cur["rates_date"], "rounds": rounds}


def pick_forecast(cur):
    """Tomorrow's bonus question: will the crowd be more or less long on this pair at the next snapshot?"""
    rows = sorted(s for s, c in cur["pairs"].items() if "long" in c and 5 <= c["long"] <= 95)
    if not rows:
        return None
    s = random.Random("fc" + cur["date"]).choice(rows)
    return {"id": cur["date"], "sym": s, "long": cur["pairs"][s]["long"], "at": cur["at"]}


def resolve_forecast(fc, cur):
    """Compare yesterday's question with the crowd now. answer: more / less / same."""
    if not fc or fc.get("id") == cur["date"]:
        return None
    now = cur["pairs"].get(fc["sym"], {}).get("long")
    if now is None:
        return None
    ans = "more" if now > fc["long"] else "less" if now < fc["long"] else "same"
    return {"id": fc["id"], "sym": fc["sym"], "from": fc["long"], "to": now, "answer": ans, "at": cur["at"]}


def teaser(cur, k=3):
    rows = sorted(((s, c) for s, c in cur["pairs"].items() if "long" in c), key=lambda kv: (-lean(kv[1]["long"]), kv[0]))
    return [{"sym": s, "long": c["long"], "score": c.get("score")} for s, c in rows[:k]]


def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="print what was read, write nothing")
    a = ap.parse_args()

    now = datetime.now(timezone.utc)
    pairs = read_crowd()
    rates_date, rates = read_rates()
    print(f"Read {len(pairs)} symbols from the sheet; ECB rates for {rates_date} ({len(rates)} currencies)")
    for s, c in sorted(pairs.items()):
        print(f"  {s:8} {c.get('long', '-'):>5}% long  score={c.get('score')}  price={price(s, rates)}")
    if sum("long" in c for c in pairs.values()) < ROUNDS:
        sys.exit("Too few symbols read from the sheet; nothing written.")

    snap = {"date": now.strftime("%Y-%m-%d"), "at": now.strftime("%Y-%m-%dT%H:%MZ"),
            "rates_date": rates_date, "rates": {k: rates[k] for k in sorted(rates)}, "pairs": pairs}

    hist = load(HISTORY, {"puzzles": 0, "snapshots": []})
    snaps = [s for s in hist["snapshots"] if s["date"] != snap["date"]] + [snap]
    snaps = snaps[-KEEP:]
    hist["snapshots"] = snaps

    daily = load(DAILY, {})
    puzzle = None
    if len(snaps) >= 2:
        last = daily.get("puzzle") or {}
        same_day = last.get("date") == snap["date"]
        n = last["n"] if same_day else hist.get("puzzles", 0) + 1
        puzzle = build_puzzle(snaps[-2], snaps[-1], n)
        if puzzle and not same_day:
            hist["puzzles"] = n
    if a.check:
        print(json.dumps({"puzzle": puzzle, "teaser": teaser(snap), "forecast": pick_forecast(snap)}, indent=1))
        print("SNAPSHOT " + json.dumps(snap, separators=(",", ":")))
        return

    prev_fc = daily.get("forecast")
    fc_result = resolve_forecast(prev_fc, snap) if (prev_fc or {}).get("id") != snap["date"] else daily.get("forecast_result")
    out = {"updated": snap["at"], "puzzle": puzzle or daily.get("puzzle"), "teaser": teaser(snap),
           "teaser_at": snap["at"], "forecast": pick_forecast(snap),
           "forecast_result": fc_result or daily.get("forecast_result")}
    os.makedirs("data", exist_ok=True)
    with open(HISTORY, "w") as f:
        json.dump(hist, f, separators=(",", ":"))
    with open(DAILY, "w") as f:
        json.dump(out, f, indent=1)
    print("Puzzle:", (out["puzzle"] or {}).get("n"), "rounds:", [r["sym"] for r in (out["puzzle"] or {}).get("rounds", [])])


if __name__ == "__main__":
    main()
