#!/usr/bin/env python3
"""Weekly CFTC Commitments of Traders: non-commercial positioning for FX majors, Gold and Silver.

Pulls the Legacy futures-only report from the CFTC public API, keeps only the
markets QDB covers, and writes data/cot.json for the website.

For each market:
  net        non-commercial long minus short (contracts)
  chg        change in net since the previous week
  long_pct   non-commercial longs as a % of all non-commercial positions
  index      COT index 0-100: where this week's net sits in its 3-year range
  z          z-score of this week's net against the same 3-year window

USD has no clean futures contract (the ICE Dollar Index is thin), so it is built
synthetically from the seven CME majors: every spec short in EUR, GBP, JPY, CHF,
CAD, AUD or NZD futures is a long USD position, and vice versa. Each leg is
converted to US dollars with the contract size and the latest FX rate, giving a
USD net position in dollars, and its index and z-score use the same 3-year window.
Each of the 28 pairs scores base index minus quote index (-100 to +100).

Standard library only. Run: python3 scripts/cot.py [--out data/cot.json] [--check]
"""
import argparse
import csv
import json
import os
import statistics
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

API = "https://publicreporting.cftc.gov/resource/6dca-aqww.json"
WEEKS = 156  # 3-year look-back for the COT index and z-score

# CFTC contract market codes
MARKETS = {
    "EUR": ("099741", "Euro FX"),
    "GBP": ("096742", "British Pound"),
    "JPY": ("097741", "Japanese Yen"),
    "CHF": ("092741", "Swiss Franc"),
    "CAD": ("090741", "Canadian Dollar"),
    "AUD": ("232741", "Australian Dollar"),
    "NZD": ("112741", "New Zealand Dollar"),
    "XAU": ("088691", "Gold"),
    "XAG": ("084691", "Silver"),
}
CONTRACT_SIZE = {"EUR": 125_000, "GBP": 62_500, "JPY": 12_500_000, "CHF": 125_000,
                 "CAD": 100_000, "AUD": 100_000, "NZD": 100_000}
# Fallback USD value of one unit of each currency, used only if the rate lookup fails
FALLBACK_USD_PER_UNIT = {"EUR": 1.15, "GBP": 1.31, "JPY": 0.0066, "CHF": 1.24,
                         "CAD": 0.71, "AUD": 0.65, "NZD": 0.57}
FX = ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"]  # market-convention base order


def fetch(code, limit=WEEKS + 2):
    q = urllib.parse.urlencode({
        "$select": "report_date_as_yyyy_mm_dd,noncomm_positions_long_all,"
                   "noncomm_positions_short_all,open_interest_all",
        "$where": f"cftc_contract_market_code='{code}'",
        "$order": "report_date_as_yyyy_mm_dd DESC",
        "$limit": str(limit),
    })
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "qdb-cot/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        rows = json.load(r)
    out = []
    for row in rows:
        out.append({
            "date": row["report_date_as_yyyy_mm_dd"][:10],
            "long": int(float(row["noncomm_positions_long_all"])),
            "short": int(float(row["noncomm_positions_short_all"])),
            "oi": int(float(row["open_interest_all"])),
        })
    return out  # newest first


def usd_per_unit():
    """Latest USD value of one unit of each major (ECB rates via frankfurter), with a static fallback."""
    try:
        q = "https://api.frankfurter.app/latest?from=USD&to=" + ",".join(CONTRACT_SIZE)
        req = urllib.request.Request(q, headers={"User-Agent": "qdb-cot/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            rates = json.load(r)["rates"]
        return {c: 1 / float(rates[c]) for c in CONTRACT_SIZE}, "ECB"
    except Exception as e:  # noqa: BLE001 - any failure falls back to static rates
        print("FX rate lookup failed, using fallback rates:", e)
        return dict(FALLBACK_USD_PER_UNIT), "fallback"


def synthetic_usd(raw, px):
    """USD rows (newest first, in US dollars) from the seven majors' spec positions."""
    by_date = {}
    for c in CONTRACT_SIZE:
        for r in raw[c]:
            by_date.setdefault(r["date"], {})[c] = r
    rows = []
    for d in sorted(by_date, reverse=True):
        legs = by_date[d]
        if len(legs) != len(CONTRACT_SIZE):
            continue
        usd = {c: CONTRACT_SIZE[c] * px[c] for c in CONTRACT_SIZE}
        rows.append({
            "date": d,
            "long": round(sum(legs[c]["short"] * usd[c] for c in legs)),   # short EUR = long USD
            "short": round(sum(legs[c]["long"] * usd[c] for c in legs)),
            "oi": round(sum(legs[c]["oi"] * usd[c] for c in legs)),
        })
    return rows


def summarise(rows):
    """rows newest first -> one market's stats."""
    nets = [r["long"] - r["short"] for r in rows[:WEEKS]]
    now = rows[0]
    net = nets[0]
    lo, hi = min(nets), max(nets)
    index = 50.0 if hi == lo else (net - lo) / (hi - lo) * 100
    sd = statistics.pstdev(nets) if len(nets) > 1 else 0
    z = 0.0 if sd == 0 else (net - statistics.fmean(nets)) / sd
    both = now["long"] + now["short"]
    return {
        "date": now["date"],
        "long": now["long"],
        "short": now["short"],
        "oi": now["oi"],
        "net": net,
        "chg": net - (nets[1] if len(nets) > 1 else net),
        "long_pct": round(now["long"] / both * 100, 1) if both else 50.0,
        "index": round(index, 1),
        "z": round(z, 2),
        "history": [n for n in reversed(nets[:26])],  # last 26 weeks, oldest first
    }


def build(raw, px=None, px_source="fallback"):
    """raw: {sym: rows newest first} -> payload dict."""
    px = px or FALLBACK_USD_PER_UNIT
    markets = {}
    for sym, (_code, name) in MARKETS.items():
        m = summarise(raw[sym])
        m["name"] = name
        markets[sym] = m

    usd = summarise(synthetic_usd(raw, px))
    usd.update(name="US Dollar (synthetic)", derived=True, unit="USD", fx=px_source)
    markets["USD"] = usd

    pairs = []
    for i, base in enumerate(FX):
        for quote in FX[i + 1:]:
            pairs.append({
                "pair": base + quote,
                "score": round(markets[base]["index"] - markets[quote]["index"], 1),
            })
    pairs.sort(key=lambda p: p["score"], reverse=True)

    dates = sorted({markets[s]["date"] for s in MARKETS})
    return {
        "report_date": dates[-1],
        "stale": [s for s in MARKETS if markets[s]["date"] != dates[-1]],
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "weeks": WEEKS,
        "source": "CFTC Commitments of Traders, Legacy futures-only",
        "currencies": {s: markets[s] for s in FX},
        "metals": {s: markets[s] for s in ("XAU", "XAG")},
        "pairs": pairs,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/cot.json")
    ap.add_argument("--check", action="store_true", help="fetch and print, don't write")
    a = ap.parse_args()

    raw = {}
    for sym, (code, name) in MARKETS.items():
        rows = fetch(code)
        if len(rows) < 52:
            sys.exit(f"{sym} ({name}, {code}): only {len(rows)} weeks returned")
        raw[sym] = rows
    px, src = usd_per_unit()
    data = build(raw, px, src)

    for s, m in {**data["currencies"], **data["metals"]}.items():
        extra = f"  net {m['net']:>8}  chg {m['chg']:>7}  z {m['z']:>5}"
        print(f"{s}  index {m['index']:>5}{extra}")
    print("top pairs:", data["pairs"][:3], "bottom:", data["pairs"][-3:])
    print("report date:", data["report_date"], "stale:", data["stale"])

    if not a.check:
        with open(a.out, "w") as f:
            json.dump(data, f, separators=(",", ":"))
            f.write("\n")
        write_csvs(data, os.path.dirname(a.out) or ".")


def write_csvs(data, folder):
    """Flat CSVs for Google Sheets: =IMPORTDATA("https://quasidb.com/data/cot-markets.csv")."""
    rd = data["report_date"]
    with open(os.path.join(folder, "cot-markets.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["market", "name", "report_date", "net", "week_change", "long_pct",
                    "cot_index", "z_score", "extreme", "unit"])
        for sym, m in {**data["currencies"], **data["metals"]}.items():
            idx = m["index"]
            w.writerow([sym, m["name"], m.get("date", rd), m.get("net", ""), m.get("chg", ""),
                        m.get("long_pct", ""), idx, m.get("z", ""),
                        "YES" if idx >= 90 or idx <= 10 else "", m.get("unit", "contracts")])
    idx = {s: m["index"] for s, m in data["currencies"].items()}
    with open(os.path.join(folder, "cot-pairs.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["pair", "cot_score", "base_index", "quote_index", "report_date"])
        for p in data["pairs"]:
            w.writerow([p["pair"], p["score"], idx[p["pair"][:3]], idx[p["pair"][3:]], rd])


if __name__ == "__main__":
    main()
