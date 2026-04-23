"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Mail,
  Eye,
  MousePointerClick,
  Users,
  Gavel,
  Share2,
  FileText,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  ComposedChart,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    activeAuctions: number;
    totalListings: number;
    subscribers: number;
    subscribersThisPeriod: number;
    scheduledPosts: number;
    totalPostsDraft: number;
    totalPostsPublished: number;
    totalCampaignsDraft: number;
    totalCampaignsSent: number;
    seoArticlesDraft: number;
    seoArticlesPublished: number;
  };
  email: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    openRate: string;
    clickRate: string;
  };
  categoryBreakdown: { category: string; count: number; avgBid: number; totalBids: number }[];
  socialByPlatform: { platform: string; total: number; published: number }[];
  timelines: {
    auctions: { date: string; lots: number; avgBid: number; totalBids: number }[];
    subscribers: { date: string; count: number }[];
    campaigns: { date: string; campaigns: number; sent: number; opened: number; clicked: number }[];
  };
  topLots: { lotNumber: string; title: string; currentBid: number; numberOfBids: number; category: string }[];
  recentActivity: { type: string; text: string; time: string }[];
}

interface MonthPoint {
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

interface CategoryTotal {
  category: string;
  total: number;
  color: string;
}

interface ExpenseData {
  monthly: { key: string; label: string; categories: Record<string, number>; total: number }[];
  categories: CategoryTotal[];
  allCategories: string[];
  categoryColors: Record<string, string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#e11d48", "#4f46e5", "#15803d", "#b45309"];
const PLATFORM_COLORS: Record<string, string> = { instagram: "#e11d48", reddit: "#f97316", facebook: "#2563eb" };
const tickStyle = { fill: "#9ca3af", fontSize: 11 };
const gridProps = { strokeDasharray: "3 3", stroke: "#374151" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtAxis = (n: number) => (Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, subtitle, color, trend }: {
  title: string; value: string | number; icon: React.ElementType; subtitle?: string; color: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend && trend !== "neutral" && (
            <span className={`flex items-center text-xs ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
              {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" && entry.name.toLowerCase().includes("revenue") ||
            entry.name.toLowerCase().includes("cost") ||
            entry.name.toLowerCase().includes("profit") ||
            entry.name.toLowerCase().includes("sales")
            ? fmt(entry.value)
            : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [report, setReport] = useState<MonthPoint[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, reportRes, expenseRes] = await Promise.all([
        fetch(apiUrl(`/api/analytics?range=${range}`)),
        fetch(apiUrl("/api/report")),
        fetch(apiUrl("/api/report/expenses")),
      ]);
      if (analyticsRes.ok) setData(await analyticsRes.json());
      if (reportRes.ok) {
        const rd = await reportRes.json();
        setReport(rd?.timeline ?? []);
      }
      if (expenseRes.ok) setExpenses(await expenseRes.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24 bg-gray-800" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16 bg-gray-800" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardHeader><Skeleton className="h-5 w-32 bg-gray-800" /></CardHeader>
              <CardContent><Skeleton className="h-64 w-full bg-gray-800" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const o = data?.overview;
  const e = data?.email;

  // Financial aggregates
  const lifetimeRevenue = report.reduce((s, m) => s + m.totalRevenue, 0);
  const lifetimeProfit = report.reduce((s, m) => s + m.netProfit, 0);
  const profitMargin = lifetimeRevenue > 0 ? (lifetimeProfit / lifetimeRevenue) * 100 : 0;
  const avgMonthlyRevenue = report.length > 0 ? lifetimeRevenue / report.length : 0;

  // Channel revenue totals for pie
  const channelTotals = [
    { name: "Auction Sales", value: report.reduce((s, m) => s + m.auctionSales, 0), fill: "#2563eb" },
    { name: "OfferUp Sales", value: report.reduce((s, m) => s + m.offerupSales, 0), fill: "#7c3aed" },
    { name: "Store Items", value: report.reduce((s, m) => s + m.storeItems, 0), fill: "#059669" },
  ].filter((c) => c.value > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-gray-400">Performance overview across all channels</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {["7d", "30d", "90d"].map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r)}
              className={range === r ? "bg-blue-600 hover:bg-blue-700" : "border-gray-700 text-gray-400 hover:text-white"}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load} className="border-gray-700 text-gray-400 hover:text-white">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Listings" value={o?.totalListings ?? 0} icon={Gavel} color="text-blue-400" subtitle={`${o?.activeAuctions ?? 0} active on HiBid`} />
        <StatCard title="Email Subscribers" value={o?.subscribers ?? 0} icon={Users} color="text-purple-400" subtitle={`+${o?.subscribersThisPeriod ?? 0} active this period`} trend={o?.subscribersThisPeriod ? "up" : "neutral"} />
        <StatCard title="Social Posts" value={(o?.totalPostsDraft ?? 0) + (o?.totalPostsPublished ?? 0) + (o?.scheduledPosts ?? 0)} icon={Share2} color="text-pink-400" subtitle={`${o?.totalPostsPublished ?? 0} published, ${o?.scheduledPosts ?? 0} scheduled`} />
        <StatCard title="SEO Articles" value={(o?.seoArticlesDraft ?? 0) + (o?.seoArticlesPublished ?? 0)} icon={FileText} color="text-green-400" subtitle={`${o?.seoArticlesPublished ?? 0} published`} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FINANCIAL PERFORMANCE SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      {report.length > 0 && (
        <>
          {/* Section divider */}
          <div className="flex items-center gap-3 pt-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            <h2 className="text-xl font-semibold">Financial Performance</h2>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* A. Financial KPI Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Lifetime Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(lifetimeRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">Across {report.length} months</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Lifetime Profit</CardTitle>
                <TrendingUp className={`h-4 w-4 ${lifetimeProfit >= 0 ? "text-green-400" : "text-red-400"}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${lifetimeProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmt(lifetimeProfit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{lifetimeProfit >= 0 ? "Net gain" : "Net loss"}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Profit Margin</CardTitle>
                <BarChart3 className={`h-4 w-4 ${profitMargin >= 0 ? "text-green-400" : "text-red-400"}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${profitMargin >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {profitMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Net profit / revenue</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Avg Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(avgMonthlyRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">Per month average</p>
              </CardContent>
            </Card>
          </div>

          {/* B. Revenue vs Costs Over Time */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Revenue vs Costs Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={report} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="finCostGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={tickStyle} />
                  <YAxis tick={tickStyle} tickFormatter={fmtAxis} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(v: string) => <span className="text-gray-300 text-sm">{v}</span>} />
                  <Area type="monotone" dataKey="totalRevenue" name="Revenue" stroke="#22c55e" fill="url(#finRevGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="totalCost" name="Total Cost" stroke="#ef4444" fill="url(#finCostGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* C. Monthly Profit Waterfall */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-yellow-400" />
                Monthly Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={report} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={tickStyle} />
                  <YAxis tick={tickStyle} tickFormatter={fmtAxis} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6 }}
                    formatter={(value) => [fmt(Number(value ?? 0)), "Net Profit"]}
                    labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                  />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
                  <Bar dataKey="netProfit" name="Net Profit" radius={[3, 3, 0, 0]}>
                    {report.map((entry, index) => (
                      <Cell key={index} fill={entry.netProfit >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* D. Expense Category Breakdown */}
          {expenses && expenses.categories.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-400" />
                  Expense Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Pie */}
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={expenses.categories}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {expenses.categories.map((cat, i) => (
                          <Cell key={i} fill={cat.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6 }}
                        formatter={(value) => [fmt(Number(value ?? 0)), "Total"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Table */}
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="py-2 text-left text-xs text-gray-400 font-medium">Category</th>
                          <th className="py-2 text-right text-xs text-gray-400 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...expenses.categories]
                          .sort((a, b) => b.total - a.total)
                          .map((cat, i) => (
                            <tr key={i} className="border-b border-gray-800/40">
                              <td className="py-2 flex items-center gap-2">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }}
                                />
                                <span className="text-gray-300">{cat.category}</span>
                              </td>
                              <td className="py-2 text-right text-gray-200 font-medium">{fmt(cat.total)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* E. Channel Revenue Split */}
          {channelTotals.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Stacked bar by month */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    Channel Revenue by Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={report} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" tick={tickStyle} />
                      <YAxis tick={tickStyle} tickFormatter={fmtAxis} />
                      <Tooltip
                        contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6 }}
                        formatter={(value) => fmt(Number(value ?? 0))}
                        labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                      />
                      <Legend formatter={(v: string) => <span className="text-gray-300 text-sm">{v}</span>} />
                      <Bar dataKey="auctionSales" name="Auction Sales" stackId="a" fill="#2563eb" />
                      <Bar dataKey="offerupSales" name="OfferUp Sales" stackId="a" fill="#7c3aed" />
                      <Bar dataKey="storeItems" name="Store Items" stackId="a" fill="#059669" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pie totals */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-purple-400" />
                    Channel Revenue Split (All Time)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={channelTotals}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {channelTotals.map((c, i) => (
                          <Cell key={i} fill={c.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6 }}
                        formatter={(value) => [fmt(Number(value ?? 0)), "Revenue"]}
                      />
                      <Legend formatter={(v: string) => <span className="text-gray-300 text-sm">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
      {/* ══════════════════════════════════════════════════════════════════════
          END FINANCIAL PERFORMANCE SECTION
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Email Performance Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Emails Sent" value={e?.totalSent?.toLocaleString() ?? "0"} icon={Mail} color="text-blue-400" />
        <StatCard title="Opened" value={e?.totalOpened?.toLocaleString() ?? "0"} icon={Eye} color="text-green-400" subtitle={`${e?.openRate ?? 0}% open rate`} />
        <StatCard title="Clicked" value={e?.totalClicked?.toLocaleString() ?? "0"} icon={MousePointerClick} color="text-yellow-400" subtitle={`${e?.clickRate ?? 0}% click rate`} />
        <StatCard title="Bounced" value={e?.totalBounced?.toLocaleString() ?? "0"} icon={TrendingUp} color="text-red-400" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Auction Listings Over Time */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gavel className="h-5 w-5 text-blue-400" />
              Auction Listings Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.timelines.auctions.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={data.timelines.auctions}>
                  <defs>
                    <linearGradient id="auctionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(v: string) => <span className="text-gray-300 text-sm">{v}</span>} />
                  <Area type="monotone" dataKey="lots" stroke="#2563eb" fill="url(#auctionGrad)" strokeWidth={2} name="Lots" />
                  <Line type="monotone" dataKey="totalBids" stroke="#7c3aed" strokeWidth={2} dot={false} name="Bids" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>No auction data yet. Scrape some auctions to see trends.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriber Growth */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Subscriber Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.timelines.subscribers.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.timelines.subscribers}>
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#7c3aed" fill="url(#subGrad)" strokeWidth={2} name="New Subscribers" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>No subscriber data yet. Add subscribers to see growth.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-400" />
              Listings by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.categoryBreakdown.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.categoryBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" tick={{ fill: "#9ca3af", fontSize: 11 }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Listings" radius={[0, 4, 4, 0]}>
                    {data.categoryBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>No category data yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Posts by Platform */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="h-5 w-5 text-pink-400" />
              Social Posts by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.socialByPlatform.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.socialByPlatform.map((s) => ({ name: s.platform, value: s.total }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.socialByPlatform.map((s, i) => (
                      <Cell key={i} fill={PLATFORM_COLORS[s.platform] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value: string) => <span className="text-gray-300 text-sm capitalize">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>No social posts yet. Generate some content!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Campaign Performance Chart */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-400" />
            Email Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.timelines.campaigns.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timelines.campaigns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value: string) => <span className="text-gray-300 text-sm">{value}</span>} />
                <Line type="monotone" dataKey="sent" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Sent" />
                <Line type="monotone" dataKey="opened" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="Opened" />
                <Line type="monotone" dataKey="clicked" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} name="Clicked" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No campaign data yet. Send your first campaign to see performance metrics.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performing Lots */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            Top Performing Auction Lots
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.topLots.length ? (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Lot #</TableHead>
                  <TableHead className="text-gray-400">Title</TableHead>
                  <TableHead className="text-gray-400">Category</TableHead>
                  <TableHead className="text-gray-400 text-right">Bids</TableHead>
                  <TableHead className="text-gray-400 text-right">Current Bid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topLots.map((lot, i) => (
                  <TableRow key={i} className="border-gray-800">
                    <TableCell className="font-mono text-blue-400">{lot.lotNumber}</TableCell>
                    <TableCell className="text-gray-200 max-w-xs truncate">{lot.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gray-700 text-gray-300 capitalize">
                        {lot.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-400">{lot.numberOfBids}</TableCell>
                    <TableCell className="text-right font-medium">${lot.currentBid.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No auction lots yet. Scrape some auctions to see top performers.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentActivity.length ? (
            <div className="space-y-3">
              {data.recentActivity.map((a, i) => (
                <div key={i} className="flex flex-col gap-2 border-b border-gray-800 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${a.type === "email" ? "bg-blue-400" : "bg-pink-400"}`} />
                    <span className="text-sm text-gray-300">{a.text}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(a.time).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No activity yet. Start creating campaigns and posts!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
