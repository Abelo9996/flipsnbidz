"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import {
  Hammer, LayoutList, Users, Mail, TrendingUp,
  Activity, DollarSign, ArrowRight, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import Link from "next/link";

interface Analytics {
  overview: {
    activeAuctions: number;
    totalListings: number;
    subscribers: number;
    scheduledPosts: number;
    totalCampaignsSent: number;
    seoArticlesPublished: number;
  };
  categoryBreakdown: { category: string; count: number; avgBid: number }[];
  topLots: {
    lotNumber: string;
    title: string;
    currentBid: number;
    numberOfBids: number;
  }[];
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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTIVITY_COLORS: Record<string, string> = {
  email: "bg-blue-600/20 text-blue-400",
  auction: "bg-green-600/20 text-green-400",
  seo: "bg-purple-600/20 text-purple-400",
  social: "bg-yellow-600/20 text-yellow-400",
  default: "bg-gray-700 text-gray-400",
};

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [report, setReport] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/api/analytics")).then((r) => r.json()).catch(() => null),
      fetch(apiUrl("/api/report")).then((r) => r.json()).catch(() => ({ timeline: [] })),
    ]).then(([analytics, reportData]) => {
      if (analytics) setData(analytics);
      setReport(reportData?.timeline ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 bg-gray-800" />
          <Skeleton className="h-4 w-40 bg-gray-800 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 bg-gray-800 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 bg-gray-800 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 bg-gray-800 rounded-xl" />
          <Skeleton className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const ov = data?.overview;

  // Financial derived values
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = report.find((m) => m.key === thisMonthKey);
  const completeMonths = report.filter((m) => m.key !== thisMonthKey);
  const lastMonth = completeMonths[completeMonths.length - 1];
  const trailing3 = completeMonths.slice(-3);
  const trailing3Avg = trailing3.length
    ? trailing3.reduce((s, m) => s + m.netProfit, 0) / trailing3.length
    : 0;
  const totalInvestment = report.reduce((s, m) => s + m.investment, 0);
  const investmentMonths = report.filter((m) => m.investment > 0).length;

  const revenueChange =
    thisMonth && lastMonth && lastMonth.totalRevenue > 0
      ? ((thisMonth.totalRevenue - lastMonth.totalRevenue) / lastMonth.totalRevenue) * 100
      : null;

  const sparkData = report.slice(-6);
  const recentMonths = report.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">{today}</p>
      </div>

      {/* ── FINANCIAL SUMMARY ─────────────────────────────────────────── */}
      {report.length > 0 && (
        <>
          {/* A. Business Health KPI Row */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* This Month Revenue */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-5">
                <p className="text-xs text-gray-400 mb-1">This Month Revenue</p>
                <p className="text-2xl font-bold">
                  {thisMonth ? fmt(thisMonth.totalRevenue) : "—"}
                </p>
                {revenueChange !== null && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${revenueChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {revenueChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(revenueChange).toFixed(1)}% vs last month
                  </p>
                )}
                {!thisMonth && <p className="text-xs text-gray-500 mt-1">In Progress</p>}
              </CardContent>
            </Card>

            {/* This Month Net Profit */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-5">
                <p className="text-xs text-gray-400 mb-1">This Month Net Profit</p>
                <p className={`text-2xl font-bold ${!thisMonth ? "text-gray-500" : thisMonth.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {thisMonth ? fmt(thisMonth.netProfit) : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {thisMonth ? (thisMonth.netProfit >= 0 ? "Profit" : "Loss") : "In Progress"}
                </p>
              </CardContent>
            </Card>

            {/* Trailing 3-Month Avg Profit */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-5">
                <p className="text-xs text-gray-400 mb-1">3-Month Avg Profit</p>
                <p className={`text-2xl font-bold ${trailing3.length === 0 ? "text-gray-500" : trailing3Avg >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {trailing3.length > 0 ? fmt(trailing3Avg) : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trailing3.length > 0 ? `Last ${trailing3.length} complete months` : "No data yet"}
                </p>
              </CardContent>
            </Card>

            {/* Total Investment */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Investment</p>
                  <p className="text-2xl font-bold">{fmt(totalInvestment)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {investmentMonths} month{investmentMonths !== 1 ? "s" : ""}
                  </p>
                </div>
                <DollarSign className="h-9 w-9 opacity-20 text-yellow-400" />
              </CardContent>
            </Card>
          </div>

          {/* B. Mini Revenue Trend Sparkline */}
          {sparkData.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                  Revenue Trend — Last {sparkData.length} Months
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={sparkData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6 }}
                      formatter={(value) => [fmt(Number(value ?? 0)), "Revenue"]}
                      labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                    />
                    <Area type="monotone" dataKey="totalRevenue" stroke="#22c55e" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* C. Recent Months Table */}
          {recentMonths.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                  Recent Months
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">Month</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">Revenue</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">Costs</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMonths.map((m) => (
                      <tr key={m.key} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-2 text-gray-300">{m.label}</td>
                        <td className="px-4 py-2 text-right text-gray-200">{fmt(m.totalRevenue)}</td>
                        <td className="px-4 py-2 text-right text-gray-400">{fmt(m.totalCost)}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${m.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {fmt(m.netProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
      {/* ── END FINANCIAL SUMMARY ─────────────────────────────────────── */}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Active Lots",
            value: ov?.activeAuctions ?? 0,
            icon: Hammer,
            color: "text-blue-400",
          },
          {
            label: "Total Listings",
            value: ov?.totalListings ?? 0,
            icon: LayoutList,
            color: "text-green-400",
          },
          {
            label: "Subscribers",
            value: ov?.subscribers ?? 0,
            icon: Users,
            color: "text-purple-400",
          },
          {
            label: "Campaigns Sent",
            value: ov?.totalCampaignsSent ?? 0,
            icon: Mail,
            color: "text-yellow-400",
          },
        ].map((s) => (
          <Card key={s.label} className="bg-gray-900 border-gray-800">
            <CardContent className="py-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
              </div>
              <s.icon className={`h-9 w-9 opacity-20 ${s.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm text-gray-400 font-medium uppercase tracking-wider">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          {[
            { label: "Social Posts", href: "/dashboard/social", icon: Activity },
            { label: "Email Campaigns", href: "/dashboard/emails", icon: Mail },
            { label: "Auction Lots", href: "/dashboard/auctions", icon: Hammer },
            { label: "Profit Sheet", href: "/dashboard/profit", icon: DollarSign },
          ].map((q) => (
            <Link key={q.href} href={q.href}>
              <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 gap-2">
                <q.icon className="h-4 w-4" />
                {q.label}
                <ArrowRight className="h-3 w-3 opacity-50" />
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Top Lots + Category Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Lots */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Top Lots
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {!data?.topLots?.length ? (
              <p className="px-6 pb-4 text-sm text-gray-500">No lots yet.</p>
            ) : (
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">Lot</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">Title</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">Bid</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">Bids</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLots.map((lot) => (
                    <tr
                      key={lot.lotNumber}
                      className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-2 text-gray-400 font-mono text-xs">#{lot.lotNumber}</td>
                      <td className="px-4 py-2 max-w-[160px]">
                        <span className="truncate block">{lot.title}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-green-400 font-semibold">
                        ${lot.currentBid.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400">
                        {lot.numberOfBids}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.categoryBreakdown?.length ? (
              <p className="text-sm text-gray-500">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={data.categoryBreakdown.slice(0, 8)}
                  margin={{ left: 8, right: 16, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recentActivity?.length ? (
            <p className="text-sm text-gray-500">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item, idx) => {
                const colorClass =
                  ACTIVITY_COLORS[item.type] || ACTIVITY_COLORS.default;
                return (
                  <div key={idx} className="flex flex-col gap-1.5 rounded-xl border border-gray-800/70 bg-gray-900/40 px-3 py-2 sm:flex-row sm:items-start sm:gap-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                    <Badge
                      className={`shrink-0 text-[10px] capitalize mt-0.5 ${colorClass}`}
                    >
                      {item.type}
                    </Badge>
                    <p className="text-sm text-gray-300 flex-1">{item.text}</p>
                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap sm:pt-0.5">
                      {timeAgo(item.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
