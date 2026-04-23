"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Gavel, Package, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";


interface MonthPoint {
  key: string; label: string; year: number; month: number;
  auctionSales: number; offerupSales: number; storeItems: number;
  totalRevenue: number; palletCost: number; expenses: number;
  totalCost: number; grossProfit: number; investment: number; netProfit: number;
}

interface ExpenseMonthly {
  key: string;
  label: string;
  categories: Record<string, number>;
  total: number;
}


const COLS = {
  auction:  "#3b82f6",
  offerup:  "#a855f7",
  store:    "#06b6d4",
  revenue:  "#22c55e",
  cost:     "#ef4444",
  profit:   "#f59e0b",
  invest:   "#6366f1",
  expenses: "#f97316",
};

const fmt = (n: number, short = false) => {
  if (short) {
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n.toFixed(0)}`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
};

function KpiCard({
  label, value, sub, icon: Icon, color,
}: { label: string; value: string; sub?: string; icon: React.ElementType; color?: string }) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="py-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-1 truncate">{label}</p>
          <p className={`text-2xl font-bold truncate ${color ?? "text-white"}`}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
        </div>
        <Icon className="h-9 w-9 shrink-0 opacity-20 text-gray-400" />
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MoneyTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-gray-200 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-medium text-white ml-auto pl-4">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const tickStyle = { fill: "#9ca3af", fontSize: 11 };
const gridProps = { strokeDasharray: "3 3", stroke: "#374151" };

export default function ReportPage() {
  const [timeline, setTimeline] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<"all" | 2025 | 2026>("all");
  const [expenseMonthly, setExpenseMonthly] = useState<ExpenseMonthly[]>([]);
  const [expenseColors, setExpenseColors] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const [reportRes, expenseRes] = await Promise.all([
        fetch(apiUrl("/api/report")),
        fetch(apiUrl("/api/report/expenses")),
      ]);

      const reportJson = await reportRes.json();
      setTimeline(reportJson.timeline ?? []);

      if (expenseRes.ok) {
        const expenseJson = await expenseRes.json();
        setExpenseMonthly(expenseJson.monthly ?? []);
        setExpenseColors(expenseJson.categoryColors ?? {});
      }
    } catch {/* */} finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const data = year === "all" ? timeline : timeline.filter(p => p.year === year);

  // KPIs across filtered view
  const totRev   = data.reduce((s, p) => s + p.totalRevenue, 0);
  const totCost  = data.reduce((s, p) => s + p.totalCost, 0);
  const totNet   = data.reduce((s, p) => s + p.netProfit, 0);
  const totAuct  = data.reduce((s, p) => s + p.auctionSales, 0);
  const totOff   = data.reduce((s, p) => s + p.offerupSales, 0);
  const totInv   = data.reduce((s, p) => s + p.investment, 0);
  const avgNet   = data.length ? totNet / data.length : 0;

  // Cumulative profit
  let cum = 0;
  const cumData = data.map(p => {
    cum += p.netProfit;
    return { ...p, cumProfit: cum };
  });

  const years = Array.from(new Set(timeline.map(p => p.year))).sort();

  const expenseDataForYear = useMemo(() => {
    if (year === "all") return expenseMonthly;
    return expenseMonthly.filter((m) => Number(m.key.split("-")[0]) === year);
  }, [expenseMonthly, year]);

  const expenseCategoryKeys = useMemo(() => {
    return Array.from(
      new Set(expenseDataForYear.flatMap((m) => Object.keys(m.categories ?? {})))
    ).sort();
  }, [expenseDataForYear]);

  // Build merged cost breakdown data: palletCost + each expense category stacked
  const costBreakdownData = useMemo(() => {
    return data.map((p) => {
      const expMonth = expenseDataForYear.find((e) => e.key === p.key);
      const point: Record<string, string | number> = {
        label: p.label,
        palletCost: p.palletCost,
      };
      for (const cat of expenseCategoryKeys) {
        point[cat] = expMonth?.categories?.[cat] ?? 0;
      }
      return point;
    });
  }, [data, expenseDataForYear, expenseCategoryKeys]);

  // Category totals for the table
  const expenseTotalsForYear = useMemo(() => {
    return expenseCategoryKeys
      .map((category) => ({
        category,
        total: expenseDataForYear.reduce((sum, m) => sum + (m.categories?.[category] ?? 0), 0),
        color: expenseColors[category] ?? "#94a3b8",
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenseDataForYear, expenseCategoryKeys, expenseColors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading business data…
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Business Report</h1>
          <p className="text-sm text-gray-400 mt-1">Revenue, profit & expenses timeline</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", ...years] as ("all" | number)[]).map(y => (
            <Button
              key={y}
              size="sm"
              variant={year === y ? "default" : "outline"}
              className={year === y ? "bg-white text-black" : "border-gray-700 text-gray-300"}
              onClick={() => setYear(y as "all" | 2025 | 2026)}
            >
              {y === "all" ? "All time" : y}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Revenue"    value={fmt(totRev)}   icon={DollarSign}   color="text-green-400"  sub={`${data.length} months`} />
        <KpiCard label="Net Profit"       value={fmt(totNet)}   icon={totNet >= 0 ? TrendingUp : TrendingDown} color={totNet >= 0 ? "text-yellow-400" : "text-red-400"} sub={`avg ${fmt(avgNet)}/mo`} />
        <KpiCard label="Auction Revenue"  value={fmt(totAuct)}  icon={Gavel}        color="text-blue-400"   sub={totRev ? `${Math.round(totAuct/totRev*100)}% of rev` : ""} />
        <KpiCard label="OfferUp / Cash"   value={fmt(totOff)}   icon={ShoppingCart} color="text-purple-400" sub={totRev ? `${Math.round(totOff/totRev*100)}% of rev` : ""} />
        <KpiCard label="Total Costs"      value={fmt(totCost)}  icon={TrendingDown} color="text-red-400" />
        <KpiCard label="Total Investment" value={fmt(totInv)}   icon={Package}      color="text-indigo-400" />
      </div>

      {/* ── Revenue breakdown stacked bars ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Revenue by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} barSize={18} barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={v => fmt(v, true)} />
              <Tooltip content={<MoneyTip />} />
              <Legend />
              <Bar dataKey="auctionSales"  name="Auction"       stackId="rev" fill={COLS.auction}  radius={[0,0,0,0]} />
              <Bar dataKey="offerupSales"  name="OfferUp/Cash"  stackId="rev" fill={COLS.offerup}  radius={[0,0,0,0]} />
              <Bar dataKey="storeItems"    name="Store Items"   stackId="rev" fill={COLS.store}    radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Revenue vs Costs area ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Revenue vs Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="grev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLS.revenue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLS.revenue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gcost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLS.cost} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLS.cost} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={v => fmt(v, true)} />
              <Tooltip content={<MoneyTip />} />
              <Legend />
              <Area type="monotone" dataKey="totalRevenue" name="Revenue" stroke={COLS.revenue} fill="url(#grev)"  strokeWidth={2} />
              <Area type="monotone" dataKey="totalCost"    name="Costs"   stroke={COLS.cost}    fill="url(#gcost)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Net profit bar ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Monthly Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={v => fmt(v, true)} />
              <Tooltip content={<MoneyTip />} />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
              <Bar dataKey="netProfit" name="Net Profit" radius={[3,3,0,0]}>
                {data.map((p, i) => (
                  <Cell key={i} fill={p.netProfit >= 0 ? COLS.revenue : COLS.cost} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Cumulative profit line ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Cumulative Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cumData}>
              <defs>
                <linearGradient id="gcum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLS.profit} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLS.profit} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={v => fmt(v, true)} />
              <Tooltip content={<MoneyTip />} />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
              <Area type="monotone" dataKey="cumProfit" name="Cumulative Profit" stroke={COLS.profit} fill="url(#gcum)" strokeWidth={2} dot={{ r: 3, fill: COLS.profit }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Cost Breakdown: Pallets + Expense Categories ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Cost Breakdown — Pallets + Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costBreakdownData} barSize={18} barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={v => fmt(v, true)} />
              <Tooltip content={<MoneyTip />} />
              <Legend />
              <Bar dataKey="palletCost" name="Pallet Cost" stackId="cost" fill={COLS.cost} radius={[0,0,0,0]} />
              {expenseCategoryKeys.map((cat) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  name={cat}
                  stackId="cost"
                  fill={expenseColors[cat] ?? "#94a3b8"}
                  radius={[0,0,0,0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {expenseTotalsForYear.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">Expense Category</th>
                    <th className="px-3 py-2 text-right text-gray-400 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseTotalsForYear.map((row) => (
                    <tr key={row.category} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-200 flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                        {row.category}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-300 font-semibold">{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Investment vs Net Profit composed ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Investment Reinvested vs Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={v => fmt(v, true)} />
              <Tooltip content={<MoneyTip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
              <Bar dataKey="investment" name="Investment" fill={COLS.invest} radius={[3,3,0,0]} opacity={0.7} />
              <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke={COLS.profit} strokeWidth={2} dot={{ r: 3, fill: COLS.profit }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Auction vs OfferUp line trend ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Auction vs OfferUp/Cash — Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={v => fmt(v, true)} />
              <Tooltip content={<MoneyTip />} />
              <Legend />
              <Line type="monotone" dataKey="auctionSales" name="Auction"      stroke={COLS.auction} strokeWidth={2} dot={{ r: 3, fill: COLS.auction }} />
              <Line type="monotone" dataKey="offerupSales" name="OfferUp/Cash" stroke={COLS.offerup} strokeWidth={2} dot={{ r: 3, fill: COLS.offerup }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>


      {/* ── Data table ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Monthly Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                {["Month","Auction","OfferUp","Store","Revenue","Pallets","Expenses","Costs","Gross","Investment","Net"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-800/40">
                  <td className="px-3 py-2 font-medium text-gray-200 whitespace-nowrap">{p.label}</td>
                  <td className="px-3 py-2 text-blue-400 whitespace-nowrap">{fmt(p.auctionSales)}</td>
                  <td className="px-3 py-2 text-purple-400 whitespace-nowrap">{fmt(p.offerupSales)}</td>
                  <td className="px-3 py-2 text-cyan-400 whitespace-nowrap">{fmt(p.storeItems)}</td>
                  <td className="px-3 py-2 text-green-400 font-medium whitespace-nowrap">{fmt(p.totalRevenue)}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{fmt(p.palletCost)}</td>
                  <td className="px-3 py-2 text-orange-400 whitespace-nowrap">{fmt(p.expenses)}</td>
                  <td className="px-3 py-2 text-red-400 whitespace-nowrap">{fmt(p.totalCost)}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{fmt(p.grossProfit)}</td>
                  <td className="px-3 py-2 text-indigo-400 whitespace-nowrap">{fmt(p.investment)}</td>
                  <td className={`px-3 py-2 font-bold whitespace-nowrap ${p.netProfit >= 0 ? "text-yellow-400" : "text-red-400"}`}>{fmt(p.netProfit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-800/60">
                <td className="px-3 py-2 font-bold text-gray-200">TOTAL</td>
                <td className="px-3 py-2 font-bold text-blue-400">{fmt(totAuct)}</td>
                <td className="px-3 py-2 font-bold text-purple-400">{fmt(totOff)}</td>
                <td className="px-3 py-2 font-bold text-cyan-400">{fmt(data.reduce((s,p)=>s+p.storeItems,0))}</td>
                <td className="px-3 py-2 font-bold text-green-400">{fmt(totRev)}</td>
                <td className="px-3 py-2 font-bold text-gray-300">{fmt(data.reduce((s,p)=>s+p.palletCost,0))}</td>
                <td className="px-3 py-2 font-bold text-orange-400">{fmt(data.reduce((s,p)=>s+p.expenses,0))}</td>
                <td className="px-3 py-2 font-bold text-red-400">{fmt(totCost)}</td>
                <td className="px-3 py-2 font-bold text-gray-300">{fmt(data.reduce((s,p)=>s+p.grossProfit,0))}</td>
                <td className="px-3 py-2 font-bold text-indigo-400">{fmt(totInv)}</td>
                <td className={`px-3 py-2 font-bold ${totNet >= 0 ? "text-yellow-400" : "text-red-400"}`}>{fmt(totNet)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
