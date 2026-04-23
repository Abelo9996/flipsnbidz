import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SHEET_ID = "14_R-C7McMS4k9jBKuny4qZmKOax3sYMJZYE7o8qOH2k";

// ── In-memory job store ─────────────────────────────────────────────────────
type JobStatus = "running" | "done" | "error";
interface Job {
  status: JobStatus;
  startedAt: number;
  result?: object;
  error?: string;
}
const jobs = new Map<string, Job>();

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function pruneOld() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of Array.from(jobs.entries())) {
    if (job.startedAt < cutoff) jobs.delete(id);
  }
}

async function fetchCSV(sheet: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return "";
    const text = await res.text();
    if (text.trim().startsWith("<")) return "";
    return text;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function runAnalysis(jobId: string, focus: string) {
  try {
    const [profitCSV, purchaseCSV, expensesCSV, cashCSV, auctionCSV] = await Promise.all([
      fetchCSV("Profit"),
      fetchCSV("Purchase"),
      fetchCSV("Expenses"),
      fetchCSV("Cash Sales"),
      fetchCSV("Auction Bank Sales"),
    ]);

    if (!profitCSV) {
      jobs.set(jobId, { ...jobs.get(jobId)!, status: "error", error: "Could not fetch Profit sheet. Is the spreadsheet shared publicly?" });
      return;
    }

    const focusNote = focus ? `\nFocus especially on: ${focus}.` : "";

    const prompt = `You are a business analyst for Flips & Bidz — a liquidation auction business in La Mirada, CA.
They buy wholesale pallets (Lowes, Amazon returns, etc.) and resell via:
- HiBid online auction (weekly Monday evenings) → "Auction Bank Sales"
- In-store cash sales → "Cash Sales"
- OfferUp marketplace (not tracked in spreadsheet yet)

Raw data:

## Profit Summary
${profitCSV}

## Purchase (pallet costs)
${purchaseCSV.slice(0, 1500)}

## Expenses
${expensesCSV.slice(0, 1200)}

## Cash Sales
${cashCSV.slice(0, 1000)}

## Auction Bank Sales
${auctionCSV.slice(0, 1500)}
${focusNote}

Return JSON:
{
  "summary": "3-4 sentence executive summary",
  "kpis": { "totalRevenue": 0, "totalCosts": 0, "netProfit": 0, "profitMargin": "X%", "avgMonthlyRevenue": 0, "monthsAnalyzed": 0 },
  "alerts": [{ "level": "warning|danger|success|info", "title": "...", "message": "..." }],
  "platformAnalysis": { "auctionRevenue": 0, "cashRevenue": 0, "storeItemsRevenue": 0, "auctionShare": "X%", "cashShare": "X%", "auctionTrend": "...", "cashTrend": "...", "insight": "..." },
  "seasonality": "2-3 sentences on seasonal patterns",
  "costAnalysis": { "avgPalletCost": 0, "avgMonthlyExpenses": 0, "expensesTrend": "...", "biggestCostDriver": "...", "insight": "..." },
  "recommendations": [{ "priority": "high|medium|low", "action": "...", "impact": "...", "rationale": "..." }],
  "dataIssues": ["..."]
}

Use REAL numbers. Be specific. USD, no formatting.`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      jobs.set(jobId, { ...jobs.get(jobId)!, status: "error", error: "OPENAI_API_KEY not set" });
      return;
    }

    const openai = new OpenAI({ apiKey, timeout: 60000 });
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3000,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");
    jobs.set(jobId, { ...jobs.get(jobId)!, status: "done", result: { success: true, analysis, generatedAt: new Date().toISOString() } });
  } catch (error) {
    jobs.set(jobId, { ...jobs.get(jobId)!, status: "error", error: String(error) });
  }
}

// POST → kick off job, return immediately
export async function POST(req: NextRequest) {
  pruneOld();

  // If already running, return that job
  for (const [id, job] of Array.from(jobs.entries())) {
    if (job.status === "running") {
      return NextResponse.json({ jobId: id, status: "running" });
    }
  }

  const body = await req.json().catch(() => ({}));
  const jobId = makeId();
  jobs.set(jobId, { status: "running", startedAt: Date.now() });

  runAnalysis(jobId, body?.focus || "").catch((err) => {
    jobs.set(jobId, { status: "error", startedAt: Date.now(), error: String(err) });
  });

  return NextResponse.json({ jobId, status: "running" });
}

// GET → poll job status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = jobs.get(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.status === "running") {
    return NextResponse.json({ jobId, status: "running", elapsed: Math.round((Date.now() - job.startedAt) / 1000) });
  }
  if (job.status === "done") {
    return NextResponse.json({ jobId, status: "done", ...job.result });
  }
  return NextResponse.json({ jobId, status: "error", error: job.error }, { status: 500 });
}
