import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";
import OpenAI from "openai";

export const maxDuration = 300;

// ─── In-memory job store (per Next.js worker process) ───────────────────────
type JobStatus = "running" | "done" | "error";
interface Job {
  status: JobStatus;
  startedAt: number;
  result?: object;
  error?: string;
}
const jobs = new Map<string, Job>();

function makeJobId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Clean up jobs older than 30 minutes so memory doesn't grow unboundedly
function pruneOldJobs() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of Array.from(jobs.entries())) {
    if (job.startedAt < cutoff) jobs.delete(id);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ScrapedLot {
  lotNum: string;
  title: string;
  highBid: number;
  bids: number;
  timeLeft: string;
  img: string;
  link: string;
}

// Scrape HiBid using Playwright (headless browser)
async function scrapeHiBidPlaywright(): Promise<ScrapedLot[]> {
  let chromium;
  try {
    chromium = (await import("playwright")).chromium;
  } catch {
    console.log("Playwright not available, skipping browser scrape");
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allLots: ScrapedLot[] = [];

  try {
    await page.goto("https://flipsandbidz.hibid.com/lots", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(5000);

    const extractLots = () =>
      page.evaluate(() => {
        const results: Array<{ lotNum: string; title: string; highBid: number; bids: number; timeLeft: string; img: string; link: string }> = [];
        const seenLinks = new Set<string>();

        // HiBid card container: div.bid-status-border
        // Each card has 2 <a href*=/lot/> links: title link + image link
        document.querySelectorAll('div.bid-status-border').forEach((card: Element) => {
          // Get the canonical lot URL from the first lot link
          const lotAnchors = Array.from(card.querySelectorAll('a[href*="/lot/"]')) as HTMLAnchorElement[];
          if (lotAnchors.length === 0) return;
          const rawLink = lotAnchors[0].href.split('?')[0]; // strip ?ref=lot-list
          if (seenLinks.has(rawLink)) return;
          seenLinks.add(rawLink);

          const text = (card as HTMLElement).innerText || "";

          // Lot number: "Lot 1 |"
          const lotMatch = text.match(/Lot\s+(\d+)\s*\|/);
          const lotNum = lotMatch ? lotMatch[1] : "";

          // Title: text after "Lot N |"
          const titleMatch = text.match(/Lot\s+\d+\s*\|\s*([^\n]+)/);
          const title = titleMatch ? titleMatch[1].trim() : "";

          // High bid: "High Bid: 5.00 USD"
          const bidMatch = text.match(/High Bid:\s*([\d,.]+)\s*USD/);
          const highBid = bidMatch ? parseFloat(bidMatch[1].replace(/,/g, "")) : 0;

          // Bid count: "1 Bid" or "3 Bids"
          const bidsMatch = text.match(/(\d+)\s+Bids?\b/);
          const bids = bidsMatch ? parseInt(bidsMatch[1]) : 0;

          // Time left: "2d 2h 24m"
          const timeMatch = text.match(/(\d+d\s+\d+h\s+\d+m)/);
          const timeLeft = timeMatch ? timeMatch[1].trim() : "";

          // Image: prefer the full-size img inside the card
          const imgEl = card.querySelector('img') as HTMLImageElement | null;
          const img = imgEl?.src || "";

          if (lotNum && title) {
            results.push({ lotNum, title, highBid, bids, timeLeft, img, link: rawLink });
          }
        });
        return results;
      });

    // Page 1
    let lots = await extractLots();
    allLots.push(...lots);

    // HiBid uses a "Load More" / infinite scroll or a "Next" button — handle both
    for (let attempt = 0; attempt < 15; attempt++) {
      // Try "Load More" button or next page arrow
      const loadedMore = await page.evaluate(() => {
        // HiBid pagination: look for "Load More" button or next chevron
        const btns = Array.from(document.querySelectorAll('button, a')) as HTMLElement[];
        for (const btn of btns) {
          const txt = (btn.textContent || "").trim().toLowerCase();
          if (txt === "load more" || txt === "show more" || txt.includes("next")) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        // Try numbered page link
        const pageLinks = document.querySelectorAll("a.page-link");
        for (let i = 0; i < pageLinks.length; i++) {
          const txt = (pageLinks[i].textContent || "").trim();
          if (txt === "›" || txt === "Next") {
            (pageLinks[i] as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (!loadedMore) break;
      await page.waitForTimeout(4000);
      lots = await extractLots();
      const newCount = lots.filter((l) => !allLots.find((a) => a.lotNum === l.lotNum)).length;
      if (newCount === 0) break; // no new lots loaded
      allLots.push(...lots.filter((l) => !allLots.find((a) => a.lotNum === l.lotNum)));
    }
  } finally {
    await browser.close();
  }

  // Deduplicate
  const unique: Record<string, ScrapedLot> = {};
  allLots.forEach((l) => { unique[l.lotNum] = l; });
  return Object.values(unique).sort((a, b) => parseInt(a.lotNum) - parseInt(b.lotNum));
}

async function categorizeAll(items: { lotNum: string; title: string }[]): Promise<Record<string, string>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "placeholder") return {};
  const openai = new OpenAI({ apiKey });
  const categories: Record<string, string> = {};
  const BATCH = 100;
  for (let i = 0; i < items.length; i += BATCH) {
    try {
      const batch = items.slice(i, i + BATCH);
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Categorize auction items: electronics, furniture, tools, appliances, kitchen, outdoor, clothing, toys, sports, home-decor, automotive, office, health-beauty, uncategorized. Return JSON: {"lotNumber": "category"}` },
          { role: "user", content: batch.map((it) => `${it.lotNum}: ${it.title}`).join("\n") },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });
      Object.assign(categories, JSON.parse(res.choices[0].message.content || "{}"));
    } catch { /* skip */ }
  }
  return categories;
}

// ─── Core scrape logic (runs in background) ─────────────────────────────────
async function runScrape(jobId: string) {
  try {
    await dbConnect();

    const lots = await scrapeHiBidPlaywright();
    const source = "hibid-live";

    // IMPORTANT: Do not silently backfill from CSV when live HiBid has no lots.
    // That can re-import stale snapshots and show phantom inventory.
    if (lots.length === 0) {
      await AuctionLot.deleteMany({ source: "hibid" });
      jobs.set(jobId, {
        ...jobs.get(jobId)!,
        status: "done",
        result: {
          success: true,
          source,
          scraped: 0,
          categorized: 0,
          message: "No live lots found on HiBid. Cleared active HiBid inventory.",
        },
      });
      return;
    }

    const categories = await categorizeAll(lots);

    const docs = lots.map((l) => ({
      lotNumber: l.lotNum,
      title: l.title,
      currentBid: l.highBid || 0,
      numberOfBids: l.bids || 0,
      views: 0,
      watches: 0,
      timeLeft: l.timeLeft || "",
      url: l.link,
      imageUrl: l.img || "",
      category: categories[l.lotNum] || "uncategorized",
      source: "hibid",
      status: "active",
      auctionDate: new Date(),
      scrapedAt: new Date(),
    }));

    await AuctionLot.deleteMany({ source: "hibid" });
    await AuctionLot.insertMany(docs);

    jobs.set(jobId, {
      ...jobs.get(jobId)!,
      status: "done",
      result: {
        success: true,
        source,
        scraped: docs.length,
        categorized: Object.keys(categories).length,
        message: `Scraped ${docs.length} lots from HiBid. AI-categorized ${Object.keys(categories).length}.`,
      },
    });
  } catch (error) {
    jobs.set(jobId, {
      ...jobs.get(jobId)!,
      status: "error",
      error: String(error),
    });
  }
}

// ─── POST /api/auctions/scrape — kick off job, return immediately ────────────
export async function POST() {
  pruneOldJobs();

  // If a job is already running, return its ID so the UI can poll it
  for (const [id, job] of Array.from(jobs.entries())) {
    if (job.status === "running") {
      return NextResponse.json({ jobId: id, status: "running", message: "Scrape already in progress." });
    }
  }

  const jobId = makeJobId();
  jobs.set(jobId, { status: "running", startedAt: Date.now() });

  // Fire and forget — do NOT await
  runScrape(jobId).catch((err) => {
    console.error("[scrape] Unhandled error:", err);
    jobs.set(jobId, { status: "error", startedAt: jobs.get(jobId)?.startedAt ?? Date.now(), error: String(err) });
  });

  return NextResponse.json({ jobId, status: "running", message: "Scrape started. Poll /api/auctions/scrape/status?jobId=<id> for progress." });
}

// ─── GET /api/auctions/scrape?jobId=xxx — poll job status ───────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found or expired" }, { status: 404 });
  }

  if (job.status === "running") {
    const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
    return NextResponse.json({ jobId, status: "running", elapsed });
  }

  if (job.status === "done") {
    return NextResponse.json({ jobId, status: "done", ...job.result });
  }

  // error
  return NextResponse.json({ jobId, status: "error", error: job.error }, { status: 500 });
}
