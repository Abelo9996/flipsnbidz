import { NextResponse } from "next/server";

const SHEET_ID = "14_R-C7McMS4k9jBKuny4qZmKOax3sYMJZYE7o8qOH2k";
const EXPENSES_GID = "281187547";

/* ── CSV helpers ─────────────────────────────────────────────────────── */
async function fetchAllRows(): Promise<string[][]> {
  // Use /export endpoint — includes hidden/collapsed grouped rows (gviz skips them)
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${EXPENSES_GID}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith("<!")) throw new Error("Not public or redirect");
  return parseCSV(text);
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

/* ── Categorizer ─────────────────────────────────────────────────────── */
// Normalize common misspellings and categorize
function categorize(desc: string): string {
  const d = desc.toLowerCase().replace(/\s+/g, " ").trim();
  if (!d || d === "." || d === "-" || d === "0" || /^\d+$/.test(d)) return "";

  // Jennifer / labor (many misspellings: jenifer, jernnifer, etc.)
  if (/jenn?ife?r|jernnifer/i.test(d)) return "Labor (Jennifer)";
  if (d.includes("employee") || d.includes("labor") || d.includes("antony")) return "Labor (Other)";

  // Payment processing
  if (d.includes("global payment") || d.includes("global payments")) return "Payment Processing";

  // HiBid platform costs
  if (/hibid|hi bid/i.test(d)) return "HiBid Fees";

  // Advertising / marketing
  if (d.includes("advertising") || d.includes("gotoauction") || d.includes("business cards") || d.includes("banner")) return "Advertising";
  if (d.includes("texting company")) return "Advertising";

  // Rent
  if (d.includes("rent") || d.includes("store rent") || d.includes("office rent")) return "Rent";

  // Insurance
  if (d.includes("insurance")) return "Insurance";

  // Tax
  if (d.includes("tax") || d.includes("cpa")) return "Tax / Accounting";

  // Tech / website
  if (d.includes("godaddy") || d.includes("website")) return "Website / Tech";
  if (d.includes("zip re") || d.includes("recruiter")) return "Website / Tech";

  // Office / supplies
  if (d.includes("office") || d.includes("supply") || d.includes("supplies") || d.includes("cartridge") || d.includes("tape") || d.includes("printer") || d.includes("skotch")) return "Office / Supplies";
  if (d.includes("bathroom") || d.includes("cleaner")) return "Office / Supplies";

  // Equipment / infrastructure
  if (d.includes("camera") || d.includes("security") || d.includes("racking")) return "Equipment";

  // Delivery
  if (d.includes("delivery")) return "Delivery";

  // Offerup fees
  if (d.includes("offerup") && !d.includes("jenifer") && !d.includes("jennifer")) return "OfferUp Fees";

  // DBA / licensing
  if (d === "dba") return "Licensing";

  return "Other";
}

/* ── Parse compound descriptions ─────────────────────────────────────── */
function parseEntry(desc: string, amount: number): { category: string; amount: number }[] {
  const d = desc.trim();

  // "Global Payments + Jennifer (168)"
  const gpJen = d.match(/Global Payments?\s*\+\s*Jenn?ife?r\s*\((\d+)\)/i);
  if (gpJen) {
    const jenAmt = parseFloat(gpJen[1]);
    const gpAmt = amount - jenAmt;
    const parts: { category: string; amount: number }[] = [];
    if (gpAmt > 0) parts.push({ category: "Payment Processing", amount: gpAmt });
    if (jenAmt > 0) parts.push({ category: "Labor (Jennifer)", amount: jenAmt });
    return parts.length > 0 ? parts : [{ category: "Other", amount }];
  }

  // "Offerup +Jenifer(50+250)"
  const ofJen = d.match(/Offerup\s*\+\s*Jenn?ife?r?\s*\((\d+)\s*\+\s*(\d+)\)/i);
  if (ofJen) {
    const a1 = parseFloat(ofJen[1]);
    const a2 = parseFloat(ofJen[2]);
    return [
      { category: "OfferUp Fees", amount: a1 },
      { category: "Labor (Jennifer)", amount: a2 },
    ];
  }

  // "Jenifer+ Jennifer (137+167)"
  const jenJen = d.match(/Jenn?ife?r?\s*\+\s*Jenn?ife?r?\s*\((\d+)\s*\+\s*(\d+)\)/i);
  if (jenJen) {
    const a1 = parseFloat(jenJen[1]);
    const a2 = parseFloat(jenJen[2]);
    return [{ category: "Labor (Jennifer)", amount: a1 + a2 }];
  }

  // "Delivery Lows+city for board+jenifer"
  if (/delivery.*jenifer|delivery.*jennifer/i.test(d)) {
    // Split roughly — attribute half to delivery, half to labor if we can't parse exact
    const half = Math.round(amount / 2);
    return [
      { category: "Delivery", amount: half },
      { category: "Labor (Jennifer)", amount: amount - half },
    ];
  }

  // "Website and Offerup"
  if (/website.*offerup|offerup.*website/i.test(d)) {
    const half = Math.round(amount / 2);
    return [
      { category: "Website / Tech", amount: half },
      { category: "OfferUp Fees", amount: amount - half },
    ];
  }

  // Simple categorization
  const cat = categorize(d);
  if (!cat) return [];
  return [{ category: cat, amount }];
}

/* ── Month helpers ───────────────────────────────────────────────────── */
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Labor (Jennifer)": "#f472b6",
  "Labor (Other)": "#ec4899",
  "Payment Processing": "#60a5fa",
  "HiBid Fees": "#818cf8",
  "Advertising": "#fb923c",
  "Rent": "#c084fc",
  "Insurance": "#a78bfa",
  "Tax / Accounting": "#fbbf24",
  "Website / Tech": "#22d3ee",
  "Office / Supplies": "#a3e635",
  "Equipment": "#e879f9",
  "Delivery": "#34d399",
  "OfferUp Fees": "#f97316",
  "Licensing": "#94a3b8",
  "Uncategorized": "#6b7280",
  "Other": "#d4d4d8",
};

export interface MonthlyBreakdown {
  key: string;
  label: string;
  categories: Record<string, number>;
  total: number;
}

export async function GET() {
  try {
    const rows = await fetchAllRows();

    // Track current month being processed
    // The sheet format:
    //   Row 1: headers
    //   Then repeating blocks: daily entries (col0=dayNum, col1=date, col2=delivery, col3=expense, col4=description)
    //   Followed by TOTAL row (col0="TOTAL", col1=date, col3=monthTotal)

    const monthlyMap = new Map<string, Record<string, number>>();
    const monthTotals = new Map<string, number>(); // from TOTAL rows

    // Figure out which month each row belongs to by scanning TOTAL rows first
    // to build a month-boundary map
    interface MonthBlock { startRow: number; endRow: number; year: number; month: number; total: number; }
    const blocks: MonthBlock[] = [];
    let lastTotalRow = 0;

    for (let i = 1; i < rows.length; i++) {
      const col0 = (rows[i][0] ?? "").trim().toUpperCase();
      if (col0 !== "TOTAL") continue;

      const dateStr = (rows[i][1] ?? "").trim();
      const total = toNum(rows[i][3]);

      // Parse date from TOTAL row
      const parts = dateStr.split("/");
      let month = 0, year = 0;
      if (parts.length === 3) {
        month = parseInt(parts[0]);
        year = parseInt(parts[2]);
      } else if (parts.length === 2) {
        month = parseInt(parts[0]);
        // 2025 months (no year in date)
        year = 2025;
      }
      if (!month || !year) continue;

      blocks.push({ startRow: lastTotalRow + 1, endRow: i - 1, year, month, total });
      monthTotals.set(monthKey(year, month), total);
      lastTotalRow = i;
    }

    // Now process each block's daily rows
    for (const block of blocks) {
      const key = monthKey(block.year, block.month);
      if (!monthlyMap.has(key)) monthlyMap.set(key, {});
      const cats = monthlyMap.get(key)!;

      for (let i = block.startRow; i <= block.endRow && i < rows.length; i++) {
        const row = rows[i];
        const col0 = (row[0] ?? "").trim();
        if (col0.toUpperCase() === "TOTAL") continue;

        const deliveryVal = toNum(row[2]);
        const expenseVal = toNum(row[3]);
        const desc = (row[4] ?? "").trim();

        // Skip header row
        if (col0.toLowerCase() === "num#") continue;

        // Delivery
        if (deliveryVal > 0) {
          cats["Delivery"] = (cats["Delivery"] ?? 0) + deliveryVal;
        }

        // Expense
        if (expenseVal > 0) {
          if (desc) {
            const parts = parseEntry(desc, expenseVal);
            for (const { category, amount } of parts) {
              cats[category] = (cats[category] ?? 0) + amount;
            }
          } else {
            cats["Uncategorized"] = (cats["Uncategorized"] ?? 0) + expenseVal;
          }
        }
      }

      // Check if categorized total matches the TOTAL row
      const categorizedSum = Object.values(cats).reduce((s, v) => s + v, 0);
      if (block.total > categorizedSum + 1) {
        cats["Uncategorized"] = (cats["Uncategorized"] ?? 0) + (block.total - categorizedSum);
      }
    }

    // Build monthly array
    const monthly: MonthlyBreakdown[] = [];
    for (const block of blocks) {
      const key = monthKey(block.year, block.month);
      const label = `${MONTH_NAMES[block.month - 1]} '${String(block.year).slice(2)}`;
      const cats = monthlyMap.get(key) ?? {};
      const total = Object.values(cats).reduce((s, v) => s + v, 0);
      if (total > 0) {
        monthly.push({ key, label, categories: cats, total });
      }
    }
    monthly.sort((a, b) => a.key.localeCompare(b.key));

    // All category names
    const allCategories = Array.from(
      new Set(monthly.flatMap((m) => Object.keys(m.categories)))
    ).sort();

    // Category totals
    const catTotals = new Map<string, number>();
    for (const m of monthly) {
      for (const [cat, amt] of Object.entries(m.categories)) {
        catTotals.set(cat, (catTotals.get(cat) ?? 0) + amt);
      }
    }
    const categories = Array.from(catTotals.entries())
      .map(([category, total]) => ({
        category,
        total,
        color: CATEGORY_COLORS[category] ?? "#94a3b8",
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      monthly,
      categories,
      allCategories,
      categoryColors: CATEGORY_COLORS,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
