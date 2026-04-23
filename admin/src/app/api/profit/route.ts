import { NextResponse } from "next/server";

const SHEET_ID = "14_R-C7McMS4k9jBKuny4qZmKOax3sYMJZYE7o8qOH2k";

const SHEET_NAMES = [
  "Profit",
  "Purchase",
  "Expenses",
  "Cash Sales",
  "Auction Bank Sales",
  "Store Items",
  "Invest to Bussines",
];

const SHEET_GIDS: Record<string, string> = {
  Profit: "995425652",
  Expenses: "281187547",
  Purchase: "1488373534",
  "Auction Bank Sales": "1117167709",
  "Cash Sales": "1683169169",
};

async function fetchSheetCSV(sheetName: string): Promise<string[][]> {
  const gid = SHEET_GIDS[sheetName];
  const url = gid
    ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching "${sheetName}"`);
  const csv = await res.text();
  if (csv.trim().startsWith("<")) throw new Error(`Sheet "${sheetName}" not publicly accessible`);
  return parseCSV(csv);
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  for (const line of csv.split("\n")) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function coerce(v: string): string | number {
  const clean = v.replace(/[$,]/g, "").trim();
  if (!clean || clean === "-" || clean === "—") return v.trim();
  const n = parseFloat(clean);
  return isNaN(n) ? v.trim() : n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sheet = searchParams.get("sheet") || "Profit";

  const canonical = SHEET_NAMES.find((s) => s.toLowerCase() === sheet.toLowerCase());
  if (!canonical) {
    return NextResponse.json({ error: `Unknown sheet. Valid: ${SHEET_NAMES.join(", ")}` }, { status: 400 });
  }

  try {
    const rawRows = await fetchSheetCSV(canonical);
    if (rawRows.length === 0) {
      return NextResponse.json({ sheet: canonical, headers: [], rows: [], sheetList: SHEET_NAMES });
    }

    const rawHeaders = rawRows[0].map((h) => h.trim());
    // Find useful columns (skip entirely empty trailing ones)
    const lastUseful = rawHeaders.reduce((max, h, i) => (h ? i : max), 0);
    const headers = rawHeaders.slice(0, lastUseful + 1);

    const dataRows = rawRows.slice(1)
      .filter((r) => r.some((v) => v.trim() !== ""))
      .map((row) => row.slice(0, headers.length).map((v) => coerce(v)));

    if (canonical === "Profit") {
      const cleanKeys = headers.map((h) => h.trim());
      const idIdx = cleanKeys.findIndex((h) => h.toLowerCase() === "id");

      const rows = dataRows
        .filter((r) => r[1] && String(r[1]).trim() !== "")
        .map((row) => {
          let year = 0;
          if (idIdx >= 0) {
            const idVal = String(row[idIdx] ?? "");
            const m = idVal.match(/\d+-(\d{2})/);
            if (m) year = 2000 + parseInt(m[1], 10);
          }
          const obj: Record<string, string | number> = { year };
          cleanKeys.forEach((h, i) => {
            const key = h || "col0";
            obj[key] = row[i] ?? "";
          });
          return obj;
        });

      const profitHeaders = ["year", ...cleanKeys.filter((h) => h && h.toLowerCase() !== "year")];
      return NextResponse.json({ sheet: canonical, headers: profitHeaders, rows, sheetList: SHEET_NAMES });
    }

    return NextResponse.json({ sheet: canonical, headers, rows: dataRows, sheetList: SHEET_NAMES });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
