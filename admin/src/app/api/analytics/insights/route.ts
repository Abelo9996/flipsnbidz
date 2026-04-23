import { NextResponse } from "next/server";

const SHEET_ID = "14_R-C7McMS4k9jBKuny4qZmKOax3sYMJZYE7o8qOH2k";

const SHEET_GIDS: Record<string, string> = {
  Profit: "995425652",
  Expenses: "281187547",
  "Auction Bank Sales": "1117167709",
  "Cash Sales": "1683169169",
};

const MONTH_MAP: Record<string, number> = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

async function fetchCSV(sheet: string): Promise<string[][]> {
  const gid = SHEET_GIDS[sheet];
  const url = gid
    ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!res.ok) return [];
  const text = await res.text();
  if (text.trim().startsWith("<")) return [];
  const rows: string[][] = [];
  for (const line of text.split("\n")) {
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

interface MonthData {
  key: string; label: string; year: number; month: number;
  palletCost: number; expenses: number; auctionCash: number; storeItems: number;
  grossProfit: number; investment: number; netProfit: number;
}

export async function GET() {
  try {
    // Fetch all sheets in parallel
    const [profitRows, expenseRows, auctionRows] = await Promise.all([
      fetchCSV("Profit"), fetchCSV("Expenses"),
      fetchCSV("Auction Bank Sales"), fetchCSV("Cash Sales"),
    ]);

    // ── Parse Profit Sheet ──
    const months: MonthData[] = [];
    if (profitRows.length > 1) {
      const hdrs = profitRows[0].map(h => h.trim().toLowerCase());
      const fi = (n: string) => hdrs.findIndex(h => h.includes(n));
      const iId = 0, iDate = 1;
      const iPal = fi("purchase pallets"), iExp = fi("expenses");
      const iAC = fi("auction and cash"), iSt = fi("store items");
      const iGP = fi("profit"), iInv = fi("financial invest");
      const iNP = hdrs.findIndex(h => h.includes("finaly profit") || h.includes("finally profit"));
      const ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      for (const row of profitRows.slice(1)) {
        const dateVal = (row[iDate] ?? "").trim();
        if (!dateVal || dateVal.toLowerCase().includes("total")) continue;
        const month = MONTH_MAP[dateVal.toLowerCase()] ?? 0;
        if (!month) continue;
        let year = 2026;
        const idMatch = (row[iId] ?? "").match(/\d+-(\d{2})/);
        if (idMatch) year = 2000 + parseInt(idMatch[1]);
        months.push({
          key: `${year}-${String(month).padStart(2, "0")}`,
          label: `${ABBR[month - 1]} '${String(year).slice(2)}`,
          year, month,
          palletCost: toNum(row[iPal]), expenses: toNum(row[iExp]),
          auctionCash: toNum(row[iAC]), storeItems: toNum(row[iSt]),
          grossProfit: toNum(row[iGP]),
          investment: iInv !== -1 ? toNum(row[iInv]) : 0,
          netProfit: iNP !== -1 ? toNum(row[iNP]) : toNum(row[iGP]),
        });
      }
    }
    months.sort((a, b) => a.key.localeCompare(b.key));

    // ── Parse Expenses for categorization ──
    const expenseBuckets: Record<string, number> = {};
    const monthlyExpenseDetail: Record<string, Record<string, number>> = {};
    if (expenseRows.length > 1) {
      const eHdrs = expenseRows[0].map(h => h.trim().toLowerCase());
      const descIdx = eHdrs.findIndex(h => h.includes("description") || h.includes("desc"));
      const amtIdx = eHdrs.findIndex(h => h.includes("amount") || h.includes("total") || h.includes("cost"));
      const dateIdx = eHdrs.findIndex(h => h.includes("date"));

      for (const row of expenseRows.slice(1)) {
        const desc = (row[descIdx] ?? "").toLowerCase();
        const amt = toNum(row[amtIdx >= 0 ? amtIdx : 2]);
        if (amt <= 0) continue;

        let category = "Other";
        if (desc.includes("jennifer") || desc.includes("labor") || desc.includes("wage")) category = "Labor";
        else if (desc.includes("global payment") || desc.includes("stripe") || desc.includes("processing")) category = "Payment Processing";
        else if (desc.includes("delivery") || desc.includes("shipping") || desc.includes("freight")) category = "Delivery";
        else if (desc.includes("rent") || desc.includes("utility") || desc.includes("electric")) category = "Rent & Utilities";
        else if (desc.includes("hibid") || desc.includes("platform")) category = "Platform Fees";
        else if (desc.includes("ad") || desc.includes("marketing") || desc.includes("flyer")) category = "Marketing";
        else if (desc.includes("insurance")) category = "Insurance";
        else if (desc.includes("supply") || desc.includes("box") || desc.includes("tape") || desc.includes("wrap")) category = "Supplies";

        expenseBuckets[category] = (expenseBuckets[category] || 0) + amt;

        // Monthly expense by category
        if (dateIdx >= 0) {
          const dateStr = (row[dateIdx] ?? "").trim();
          const dMatch = dateStr.match(/(\d{1,2})\/\d+\/(\d{2,4})/);
          if (dMatch) {
            let yr = parseInt(dMatch[2]);
            if (yr < 100) yr += 2000;
            const mKey = `${yr}-${String(parseInt(dMatch[1])).padStart(2, "0")}`;
            if (!monthlyExpenseDetail[mKey]) monthlyExpenseDetail[mKey] = {};
            monthlyExpenseDetail[mKey][category] = (monthlyExpenseDetail[mKey][category] || 0) + amt;
          }
        }
      }
    }

    // ── Parse Auction Bank Sales for weekly data ──
    const weeklyAuction: { date: string; amount: number; lotCount: number }[] = [];
    if (auctionRows.length > 1) {
      for (const row of auctionRows.slice(1)) {
        const c0 = (row[0] ?? "").trim();
        if (c0.toUpperCase().startsWith("TOTAL") || !c0) continue;
        const date = (row[1] ?? "").trim();
        const amt = toNum(row[4]) || toNum(row[3]);
        const lots = parseInt(row[2] || "0") || 0;
        if (amt > 0 && date) weeklyAuction.push({ date, amount: amt, lotCount: lots });
      }
    }

    // ── Compute Insights ──

    // 1. Month-over-month growth rates
    const growthData = months.slice(1).map((m, i) => {
      const prev = months[i];
      const revenueGrowth = prev.auctionCash + prev.storeItems > 0
        ? ((m.auctionCash + m.storeItems - prev.auctionCash - prev.storeItems) / (prev.auctionCash + prev.storeItems)) * 100
        : 0;
      const expenseGrowth = prev.expenses > 0
        ? ((m.expenses - prev.expenses) / prev.expenses) * 100
        : 0;
      return { label: m.label, revenueGrowth: Math.round(revenueGrowth * 10) / 10, expenseGrowth: Math.round(expenseGrowth * 10) / 10 };
    });

    // 2. Cost efficiency (pallet cost per dollar of revenue)
    const costEfficiency = months.map(m => {
      const revenue = m.auctionCash + m.storeItems;
      const costPerDollar = revenue > 0 ? m.palletCost / revenue : 0;
      const margin = revenue > 0 ? ((revenue - m.palletCost - m.expenses) / revenue) * 100 : 0;
      return {
        label: m.label,
        costPerDollar: Math.round(costPerDollar * 100) / 100,
        marginPct: Math.round(margin * 10) / 10,
        palletCost: m.palletCost,
        revenue,
      };
    });

    // 3. Best/worst months
    const sorted = [...months].sort((a, b) => b.netProfit - a.netProfit);
    const bestMonths = sorted.slice(0, 3).map(m => ({ label: m.label, netProfit: m.netProfit, revenue: m.auctionCash + m.storeItems }));
    const worstMonths = sorted.slice(-3).reverse().map(m => ({ label: m.label, netProfit: m.netProfit, revenue: m.auctionCash + m.storeItems }));

    // 4. Expense category trend (which categories are growing)
    const expenseCategories = Object.entries(expenseBuckets)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // 5. Seasonality — avg profit/revenue by month-of-year
    const byMonthOfYear: Record<number, { revenues: number[]; profits: number[] }> = {};
    for (const m of months) {
      if (!byMonthOfYear[m.month]) byMonthOfYear[m.month] = { revenues: [], profits: [] };
      byMonthOfYear[m.month].revenues.push(m.auctionCash + m.storeItems);
      byMonthOfYear[m.month].profits.push(m.netProfit);
    }
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const seasonality = Object.entries(byMonthOfYear).map(([mo, data]) => ({
      month: MONTH_NAMES[parseInt(mo) - 1],
      avgRevenue: Math.round(data.revenues.reduce((s, v) => s + v, 0) / data.revenues.length),
      avgProfit: Math.round(data.profits.reduce((s, v) => s + v, 0) / data.profits.length),
      samples: data.revenues.length,
    })).sort((a, b) => MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month));

    // 6. Investment ROI tracking
    const investmentMonths = months.filter(m => m.investment > 0);
    const totalInvested = investmentMonths.reduce((s, m) => s + m.investment, 0);
    const totalNetProfit = months.reduce((s, m) => s + m.netProfit, 0);
    const investmentROI = totalInvested > 0 ? ((totalNetProfit / totalInvested) * 100) : 0;

    // 7. Cumulative profit curve
    let cumProfit = 0;
    const cumulativeProfitCurve = months.map(m => {
      cumProfit += m.netProfit;
      return { label: m.label, cumulative: Math.round(cumProfit), monthly: m.netProfit };
    });

    // 8. Expense-to-revenue ratio over time
    const expenseRatio = months.map(m => {
      const revenue = m.auctionCash + m.storeItems;
      return {
        label: m.label,
        expenseRatio: revenue > 0 ? Math.round((m.expenses / revenue) * 1000) / 10 : 0,
        palletRatio: revenue > 0 ? Math.round((m.palletCost / revenue) * 1000) / 10 : 0,
      };
    });

    // 9. Breakeven analysis
    const avgMonthlyCost = months.length > 0 ? months.reduce((s, m) => s + m.palletCost + m.expenses, 0) / months.length : 0;
    const avgMonthlyRevenue = months.length > 0 ? months.reduce((s, m) => s + m.auctionCash + m.storeItems, 0) / months.length : 0;
    const profitableMonths = months.filter(m => m.netProfit > 0).length;
    const unprofitableMonths = months.filter(m => m.netProfit < 0).length;

    return NextResponse.json({
      monthlyData: months,
      growthData,
      costEfficiency,
      bestMonths,
      worstMonths,
      expenseCategories,
      monthlyExpenseDetail,
      seasonality,
      investment: {
        totalInvested,
        totalNetProfit: Math.round(totalNetProfit),
        roi: Math.round(investmentROI * 10) / 10,
        months: investmentMonths.map(m => ({ label: m.label, invested: m.investment, netProfit: m.netProfit })),
      },
      cumulativeProfitCurve,
      expenseRatio,
      breakeven: {
        avgMonthlyCost: Math.round(avgMonthlyCost),
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
        profitableMonths,
        unprofitableMonths,
        totalMonths: months.length,
        profitRate: months.length > 0 ? Math.round((profitableMonths / months.length) * 100) : 0,
      },
      weeklyAuctionSamples: weeklyAuction.slice(-12),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
