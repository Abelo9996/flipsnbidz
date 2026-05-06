import { NextResponse } from "next/server";

const SHEET_ID = "14_R-C7McMS4k9jBKuny4qZmKOax3sYMJZYE7o8qOH2k";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_MAP: Record<string, number> = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
  jan:1, feb:2, mar:3, apr:4, jun:6,
  jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
};

// Sheet gids for the /export endpoint (includes ALL rows, even collapsed/grouped)
const SHEET_GIDS: Record<string, string> = {
  Profit: "995425652",
  "Auction Bank Sales": "1117167709",
  "Cash Sales": "1683169169",
};

export interface MonthPoint {
  key: string;
  label: string;
  year: number;
  month: number;
  auctionSales: number;
  offerupSales: number;
  storeItems: number;
  totalRevenue: number;
  palletCost: number;
  expenses: number;
  totalCost: number;
  grossProfit: number;
  investment: number;
  netProfit: number;
}

interface PRow {
  year: number; month: number;
  palletCost: number; expenses: number;
  auctionCash: number; storeItems: number;
  grossProfit: number; investment: number; netProfit: number;
}

/* ── CSV fetcher using /export (includes collapsed rows) ─────────────── */
async function fetchCSV(sheetName: string): Promise<string[][]> {
  const gid = SHEET_GIDS[sheetName];
  const url = gid
    ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.trim().startsWith("<")) throw new Error("Not public");
    return parseCSV(text);
  } finally {
    clearTimeout(timeout);
  }
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  for (const line of csv.split("\n")) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function toNum(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[$,""]/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function parseMY(s: string, fallbackYear = 2025): { month: number; year: number } | null {
  const parts = (s ?? "").trim().split("/");
  if (parts.length === 2) {
    const m = parseInt(parts[0]);
    return isNaN(m) ? null : { month: m, year: fallbackYear };
  }
  if (parts.length === 3) {
    const m = parseInt(parts[0]);
    let y = parseInt(parts[2]);
    if (isNaN(m) || isNaN(y)) return null;
    // Handle both 2-digit (25) and 4-digit (2025) years
    if (y < 100) y += 2000;
    return { month: m, year: y };
  }
  return null;
}

export async function GET() {
  // ── 1. Profit sheet — ALL rows via /export ────────────────────────────────
  const profitRows: PRow[] = [];
  try {
    const rows = await fetchCSV("Profit");
    if (rows.length > 1) {
      const hdrs = rows[0].map(h => h.trim().toLowerCase());
      const fi = (n: string) => hdrs.findIndex(h => h.includes(n));
      const iId = 0;
      const iDate = 1;
      const iPal = fi("purchase pallets");
      const iExp = fi("expenses");
      const iAC  = fi("auction and cash");
      const iSt  = fi("store items");
      const iGP  = fi("profit");
      const iInv = fi("financial invest");
      const iNP  = hdrs.findIndex(h => h.includes("finaly profit") || h.includes("finally profit"));

      for (const row of rows.slice(1)) {
        const id = (row[iId] ?? "").trim();
        const dateVal = (row[iDate] ?? "").trim();
        if (!dateVal || dateVal.toLowerCase().includes("total")) continue;

        // Parse year from the id column (e.g. "1-25" -> 2025, "3-26" -> 2026)
        let year = 2026;
        const idMatch = id.match(/\d+-(\d{2})/);
        if (idMatch) {
          year = 2000 + parseInt(idMatch[1]);
        }

        const monthWord = dateVal.toLowerCase().split(/[\s,\/\-]+/)[0];
        const month = MONTH_MAP[monthWord] ?? MONTH_MAP[dateVal.toLowerCase()] ?? 0;
        if (!month) continue;

        profitRows.push({
          year, month,
          palletCost:  toNum(row[iPal]),
          expenses:    toNum(row[iExp]),
          auctionCash: toNum(row[iAC]),
          storeItems:  toNum(row[iSt]),
          grossProfit: toNum(row[iGP]),
          investment:  iInv !== -1 ? toNum(row[iInv]) : 0,
          netProfit:   iNP  !== -1 ? toNum(row[iNP])  : toNum(row[iGP]),
        });
      }
    }
  } catch { /* use empty */ }

  // ── 2. Auction Bank Sales monthly totals ──────────────────────────────────
  const auctionMap = new Map<string, number>();
  try {
    const rows = await fetchCSV("Auction Bank Sales");
    let fy = 2025;
    for (const row of rows.slice(1)) {
      if (!row[0]?.trim().toUpperCase().startsWith("TOTAL")) continue;
      const d = parseMY(row[1] ?? "", fy);
      if (!d) continue;
      fy = d.year;
      const amt = toNum(row[4]) || toNum(row[3]);
      if (amt > 0) auctionMap.set(`${d.year}-${String(d.month).padStart(2, "0")}`, amt);
    }
  } catch { /* skip */ }

  // ── 3. Cash Sales (OfferUp) monthly totals ────────────────────────────────
  const offerupMap = new Map<string, number>();
  try {
    const rows = await fetchCSV("Cash Sales");
    for (const row of rows.slice(1)) {
      const c0 = (row[0] ?? "").trim().toLowerCase();
      const c1 = (row[1] ?? "").trim().toLowerCase();

      // Format A: "TOTAL,4/30/2025,1753,..." or "Total,12/31/2025,7395,..."
      if (c0.startsWith("total")) {
        const d = parseMY(row[1] ?? "");
        if (!d) continue;
        const amt = toNum(row[2]);
        if (amt > 0) offerupMap.set(`${d.year}-${String(d.month).padStart(2, "0")}`, amt);
        continue;
      }

      // Format B: "11,Total,695,February" (early months — month name in col3)
      if (c1 === "total") {
        const monthName = (row[3] ?? "").trim().toLowerCase();
        const month = MONTH_MAP[monthName];
        if (!month) continue;
        const amt = toNum(row[2]);
        // These early rows don't have year in them — infer from surrounding context
        // February/March 2025 based on sheet structure
        if (amt > 0) offerupMap.set(`2025-${String(month).padStart(2, "0")}`, amt);
        continue;
      }
    }
  } catch { /* skip */ }

  // ── 4. Merge timeline ─────────────────────────────────────────────────────
  const timeline: MonthPoint[] = profitRows.map(r => {
    const key   = `${r.year}-${String(r.month).padStart(2, "0")}`;
    const label = `${MONTH_ABBR[r.month - 1]} '${String(r.year).slice(2)}`;

    const hasAuction = auctionMap.has(key);
    const hasOfferup = offerupMap.has(key);
    const auctionSales = hasAuction ? auctionMap.get(key)! : r.auctionCash;
    // When Cash Sales has no total row for this month but we have auction data,
    // derive cash/OfferUp sales = combined figure - auction-only figure.
    // If neither source has data, offerupSales stays 0.
    const offerupSales = hasOfferup
      ? offerupMap.get(key)!
      : hasAuction
        ? Math.max(0, r.auctionCash - auctionMap.get(key)!)
        : 0;

    return {
      key, label, year: r.year, month: r.month,
      auctionSales,
      offerupSales,
      storeItems: r.storeItems,
      totalRevenue: auctionSales + offerupSales + r.storeItems,
      palletCost: r.palletCost,
      expenses: r.expenses,
      totalCost: r.palletCost + r.expenses,
      grossProfit: r.grossProfit,
      investment: r.investment,
      netProfit: r.netProfit,
    };
  });

  timeline.sort((a, b) => a.key.localeCompare(b.key));

  // Strip months beyond the current month (pre-entered future rows in the sheet)
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const capped = timeline.filter(m => m.key <= currentKey);

  return NextResponse.json({ timeline: capped });
}
