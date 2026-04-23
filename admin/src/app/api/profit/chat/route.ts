import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";
import Subscriber from "@/lib/models/Subscriber";
import EmailCampaign from "@/lib/models/EmailCampaign";
import SocialPost from "@/lib/models/SocialPost";
import SEOArticle from "@/lib/models/SEOArticle";

const SHEET_ID = "14_R-C7McMS4k9jBKuny4qZmKOax3sYMJZYE7o8qOH2k";

// Map sheet names to gids for the /export endpoint (includes ALL rows, even collapsed/grouped)
const SHEET_GIDS: Record<string, string> = {
  Profit: "995425652",
  Expenses: "281187547",
  Purchase: "1488373534",
  "Auction Bank Sales": "1117167709",
  "Cash Sales": "1683169169",
};

/* ── Sheet fetcher (uses /export to include ALL rows, even collapsed) ── */
async function fetchCSV(sheet: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const gid = SHEET_GIDS[sheet];
    const url = gid
      ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
      : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return `[Error: HTTP ${res.status}]`;
    const text = await res.text();
    if (text.trim().startsWith("<")) return "[Error: sheet not public or not found]";
    return text;
  } catch {
    return "[Error: timeout or network failure]";
  } finally {
    clearTimeout(timeout);
  }
}

/* ── Tool definitions ──────────────────────────────────────────────────── */
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read_sheet",
      description:
        "Fetch raw CSV data from a specific Google Sheets tab. Available sheets: 'Profit', 'Purchase', 'Expenses', 'Cash Sales', 'Auction Bank Sales'. Returns full CSV text.",
      parameters: {
        type: "object",
        properties: {
          sheet: {
            type: "string",
            description: "Sheet tab name, e.g. 'Profit', 'Expenses', 'Cash Sales'",
          },
        },
        required: ["sheet"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_all_sheets",
      description:
        "Fetch ALL sheets at once (Profit, Purchase, Expenses, Cash Sales, Auction Bank Sales). Use this when you need a comprehensive overview or multi-sheet analysis.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "render_chart",
      description: `Emit a chart that the frontend will render using Recharts. Supported chart types: bar, line, area, composed, pie.
Return a JSON object with: { type, title, data (array of objects), series (array of {key, name, color, stackId?}), xKey (field for X axis) }.
Colors should be hex like #3b82f6. For pie charts, data items need {name, value, color}.
IMPORTANT: You MUST call this tool to show a chart. Do not write chart JSON in your text response.`,
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["bar", "line", "area", "composed", "pie"] },
          title: { type: "string" },
          data: {
            type: "array",
            items: { type: "object" },
            description: "Array of data point objects",
          },
          series: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                name: { type: "string" },
                color: { type: "string" },
                stackId: { type: "string" },
                type: { type: "string", enum: ["bar", "line", "area"] },
              },
              required: ["key", "name", "color"],
            },
          },
          xKey: { type: "string", description: "Key for X axis labels" },
        },
        required: ["type", "title", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_table",
      description: `Emit a styled data table that the frontend will render.
Return a JSON object with: { title, columns (array of {key, label, align?}), rows (array of objects), highlight? (row indices to highlight) }.
IMPORTANT: You MUST call this tool to show a table. Do not write table markdown in your text response when structured data is involved.`,
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          columns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                align: { type: "string", enum: ["left", "center", "right"] },
              },
              required: ["key", "label"],
            },
          },
          rows: { type: "array", items: { type: "object" } },
          highlight: {
            type: "array",
            items: { type: "number" },
            description: "Row indices (0-based) to highlight",
          },
        },
        required: ["title", "columns", "rows"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_kpi",
      description: `Emit a row of KPI metric cards. Each card has: { label, value, sub?, color? (tailwind text color like 'text-green-400') }.
IMPORTANT: You MUST call this tool to show KPI cards.`,
      parameters: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                sub: { type: "string" },
                color: { type: "string" },
              },
              required: ["label", "value"],
            },
          },
        },
        required: ["cards"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_auction_lots",
      description: "Fetch current HiBid auction lot data from the database. Returns lot details including title, currentBid, numberOfBids, views, watches, category, status, timeLeft. Optional filters: category, status (active/sold/ended).",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category" },
          status: { type: "string", description: "Filter: active, sold, ended" },
          limit: { type: "number", description: "Max results (default 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_offerup_listings",
      description: "Fetch current OfferUp listing data from the database. Returns listing details including title, currentBid (price), views, watches, category, status, description (location).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter: active, sold" },
          limit: { type: "number", description: "Max results (default 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_analytics",
      description: "Fetch business analytics overview: active auctions, total listings, subscriber count, email campaign stats, auction category breakdown, social media posts by platform, top performing lots, and recent activity.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "read_subscribers",
      description: "Fetch email subscriber list with stats. Returns subscriber count, recent growth, and subscriber data.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max subscribers (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_email_campaigns",
      description: "Fetch email campaign data: name, status, stats (sent, opened, clicked, bounced), subject lines, send dates.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter: draft, sent, scheduled" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_social_posts",
      description: "Fetch social media posts: platform, content, status, scheduled time.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", description: "Filter by platform" },
          status: { type: "string", description: "Filter: draft, scheduled, published" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_seo_articles",
      description: "Fetch SEO blog articles: title, slug, status, keywords, word count.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter: draft, published" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
];

/* ── Execute tool calls ──────────────────────────────────────────────────── */
async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ result?: string; render?: object }> {
  switch (name) {
    case "read_sheet": {
      const csv = await fetchCSV(args.sheet as string);
      return { result: csv };
    }
    case "read_all_sheets": {
      const [profit, purchase, expenses, cash, auction] = await Promise.all([
        fetchCSV("Profit"),
        fetchCSV("Purchase"),
        fetchCSV("Expenses"),
        fetchCSV("Cash Sales"),
        fetchCSV("Auction Bank Sales"),
      ]);
      return {
        result: `## Profit\n${profit}\n\n## Purchase\n${purchase}\n\n## Expenses\n${expenses}\n\n## Cash Sales\n${cash}\n\n## Auction Bank Sales\n${auction}`,
      };
    }
    case "render_chart":
      return { render: { block: "chart", ...args }, result: "[Chart rendered]" };
    case "render_table":
      return { render: { block: "table", ...args }, result: "[Table rendered]" };
    case "render_kpi":
      return { render: { block: "kpi", ...args }, result: "[KPI cards rendered]" };
    case "read_auction_lots": {
      await dbConnect();
      const filter: Record<string, unknown> = { source: { $ne: "offerup" } };
      if (args.category) filter.category = args.category;
      if (args.status) filter.status = args.status;
      const limit = Math.min(Number(args.limit) || 500, 500);
      const totalCount = await AuctionLot.countDocuments(filter);
      const lots = await AuctionLot.find(filter).sort({ currentBid: -1 }).limit(limit).lean();
      // Compute category stats
      const catStats: Record<string, { count: number; totalBid: number; totalBids: number; totalViews: number }> = {};
      for (const l of lots) {
        const cat = l.category || "uncategorized";
        if (!catStats[cat]) catStats[cat] = { count: 0, totalBid: 0, totalBids: 0, totalViews: 0 };
        catStats[cat].count++;
        catStats[cat].totalBid += l.currentBid || 0;
        catStats[cat].totalBids += l.numberOfBids || 0;
        catStats[cat].totalViews += l.views || 0;
      }
      const summary = {
        totalInDB: totalCount,
        returned: lots.length,
        totalValue: lots.reduce((s, l) => s + (l.currentBid || 0), 0),
        totalBids: lots.reduce((s, l) => s + (l.numberOfBids || 0), 0),
        totalViews: lots.reduce((s, l) => s + (l.views || 0), 0),
        totalWatches: lots.reduce((s, l) => s + (l.watches || 0), 0),
        byCategory: Object.entries(catStats).map(([cat, s]) => ({
          category: cat, count: s.count, avgBid: Math.round(s.totalBid / s.count * 100) / 100,
          totalBids: s.totalBids, totalViews: s.totalViews,
        })).sort((a, b) => b.count - a.count),
        lots: lots.map(l => ({
          lotNumber: l.lotNumber, title: l.title, currentBid: l.currentBid,
          numberOfBids: l.numberOfBids, views: l.views, watches: l.watches,
          category: l.category, status: l.status, timeLeft: l.timeLeft,
        })),
      };
      return { result: JSON.stringify(summary) };
    }
    case "read_offerup_listings": {
      await dbConnect();
      const filter: Record<string, unknown> = { source: "offerup" };
      if (args.status) filter.status = args.status;
      const limit = Math.min(Number(args.limit) || 100, 200);
      const lots = await AuctionLot.find(filter).sort({ currentBid: -1 }).limit(limit).lean();
      const summary = {
        total: lots.length,
        active: lots.filter(l => l.status === "active").length,
        sold: lots.filter(l => l.status === "sold").length,
        totalValue: lots.reduce((s, l) => s + (l.currentBid || 0), 0),
        listings: lots.map(l => ({
          title: l.title, price: l.currentBid, views: l.views, watches: l.watches,
          category: l.category, status: l.status, location: l.description,
        })),
      };
      return { result: JSON.stringify(summary) };
    }
    case "read_analytics": {
      await dbConnect();
      const [activeAuctions, totalListings, offerupListings, subscribers, sentCampaigns, publishedPosts, publishedArticles] = await Promise.all([
        AuctionLot.countDocuments({ status: "active", source: { $ne: "offerup" } }),
        AuctionLot.countDocuments({ source: { $ne: "offerup" } }),
        AuctionLot.countDocuments({ source: "offerup" }),
        Subscriber.countDocuments({ status: "active" }),
        EmailCampaign.countDocuments({ status: "sent" }),
        SocialPost.countDocuments({ status: "published" }),
        SEOArticle.countDocuments({ status: "published" }),
      ]);
      const categoryBreakdown = await AuctionLot.aggregate([
        { $match: { source: { $ne: "offerup" } } },
        { $group: { _id: "$category", count: { $sum: 1 }, avgBid: { $avg: "$currentBid" }, totalBids: { $sum: "$numberOfBids" } } },
        { $sort: { count: -1 } }, { $limit: 15 },
      ]);
      const emailAgg = await EmailCampaign.aggregate([
        { $match: { status: "sent" } },
        { $group: { _id: null, totalSent: { $sum: "$stats.sent" }, totalOpened: { $sum: "$stats.opened" }, totalClicked: { $sum: "$stats.clicked" } } },
      ]);
      const emailStats = emailAgg[0] || { totalSent: 0, totalOpened: 0, totalClicked: 0 };
      const topLots = await AuctionLot.find({ source: { $ne: "offerup" } }).sort({ numberOfBids: -1 }).limit(5).select("title currentBid numberOfBids category").lean();
      return {
        result: JSON.stringify({
          overview: { activeAuctions, totalListings, offerupListings, subscribers, sentCampaigns, publishedPosts, publishedArticles },
          email: { ...emailStats, openRate: emailStats.totalSent > 0 ? ((emailStats.totalOpened / emailStats.totalSent) * 100).toFixed(1) + "%" : "0%" },
          categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id, count: c.count, avgBid: Math.round(c.avgBid * 100) / 100 })),
          topLots,
        }),
      };
    }
    case "read_subscribers": {
      await dbConnect();
      const limit = Math.min(Number(args.limit) || 50, 200);
      const [total, recent30d, subs] = await Promise.all([
        Subscriber.countDocuments({ status: "active" }),
        Subscriber.countDocuments({ status: "active", subscribedAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
        Subscriber.find({ status: "active" }).sort({ subscribedAt: -1 }).limit(limit).select("email name subscribedAt").lean(),
      ]);
      return { result: JSON.stringify({ total, newLast30Days: recent30d, subscribers: subs }) };
    }
    case "read_email_campaigns": {
      await dbConnect();
      const filter: Record<string, unknown> = {};
      if (args.status) filter.status = args.status;
      const limit = Math.min(Number(args.limit) || 20, 50);
      const campaigns = await EmailCampaign.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      return {
        result: JSON.stringify(campaigns.map(c => ({
          name: c.name, subject: c.subject, status: c.status,
          stats: c.stats, sentAt: c.sentAt, createdAt: c.createdAt,
        }))),
      };
    }
    case "read_social_posts": {
      await dbConnect();
      const filter: Record<string, unknown> = {};
      if (args.platform) filter.platform = args.platform;
      if (args.status) filter.status = args.status;
      const limit = Math.min(Number(args.limit) || 20, 50);
      const posts = await SocialPost.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      return {
        result: JSON.stringify(posts.map(p => ({
          platform: p.platform, content: (p.content || "").slice(0, 200),
          status: p.status, scheduledFor: p.scheduledFor, createdAt: p.createdAt,
        }))),
      };
    }
    case "read_seo_articles": {
      await dbConnect();
      const filter: Record<string, unknown> = {};
      if (args.status) filter.status = args.status;
      const limit = Math.min(Number(args.limit) || 20, 50);
      const articles = await SEOArticle.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      return {
        result: JSON.stringify(articles.map(a => ({
          title: a.title, slug: a.slug, status: a.status,
          keywords: a.keywords, wordCount: a.content?.split(/\s+/).length || 0, createdAt: a.createdAt,
        }))),
      };
    }
    default:
      return { result: `Unknown tool: ${name}` };
  }
}

/* ── System prompt ─────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a senior business analyst for **Flips & Bidz** — a liquidation auction business in La Mirada / Santa Fe Springs, CA.

They buy wholesale pallets (Lowes, Amazon returns, etc.) and resell via:
- HiBid online auctions (weekly, close Monday evenings) → "Auction Bank Sales" sheet + live auction lot data
- In-store cash sales & OfferUp marketplace → "Cash Sales" sheet + live OfferUp listing data
- Some months have "Store Items" revenue (in-store retail)

## Available Data Sources

### Google Sheets (Financial Data)
- **Profit** — Monthly P&L summary (2026 rows live, 2025 hardcoded in app)
- **Purchase** — Individual pallet purchases and monthly totals
- **Expenses** — Daily expense entries with descriptions and monthly totals
- **Cash Sales** — Daily cash/OfferUp sales with weekly and monthly subtotals
- **Auction Bank Sales** — Weekly auction revenue with buyer premiums, lot counts, retail totals

### Database (Live Operations)
- **Auction Lots** — Current HiBid listings with bids, views, watches, categories, time remaining
- **OfferUp Listings** — Current OfferUp inventory with prices, status, locations
- **Analytics** — Aggregate business metrics across all channels
- **Subscribers** — Email subscriber list and growth metrics
- **Email Campaigns** — Campaign performance data (sent, opened, clicked, bounced)
- **Social Posts** — Social media content across platforms (Instagram, Facebook, Reddit, etc.)
- **SEO Articles** — Blog content for organic traffic

## When to Use Which Tool
- Financial questions (revenue, costs, profit, expenses) → read_sheet or read_all_sheets
- Current inventory / live auction status → read_auction_lots or read_offerup_listings
- Business overview / cross-channel metrics → read_analytics
- Marketing questions → read_email_campaigns, read_social_posts, read_subscribers
- SEO / content questions → read_seo_articles
- Comprehensive analysis → combine multiple tools

## CRITICAL OUTPUT RULES — READ CAREFULLY

You have render_chart, render_table, and render_kpi tools. You MUST use them for ALL visual output.

**FORBIDDEN — never do these:**
- NEVER write markdown tables (| col | col |) in your text response
- NEVER describe chart data in text ("here's a chart showing...")
- NEVER write JSON or data structures in your text response
- NEVER say "I've created a chart" without actually calling render_chart

**REQUIRED — always do these:**
- To show ANY tabular data → call render_table tool
- To show ANY chart/graph/plot → call render_chart tool
- To show summary metrics → call render_kpi tool
- After calling render tools, write a SHORT analysis (2-4 sentences) about insights, NOT a description of what the chart shows

## Workflow
1. User asks a question → call read_sheet or read_all_sheets to get fresh data
2. Analyze the data
3. Call render_chart / render_table / render_kpi with the processed data
4. Write a brief text insight (what's interesting, actionable advice)

## render_chart usage
Always provide the series array. Example:
\`\`\`
render_chart({
  type: "bar",
  title: "Expenses vs Profit",
  data: [{month: "Jan", expenses: 7981, profit: -10870}, ...],
  xKey: "month",
  series: [
    {key: "expenses", name: "Expenses", color: "#ef4444"},
    {key: "profit", name: "Profit", color: "#22c55e"}
  ]
})
\`\`\`

## render_table usage
Always provide columns and rows. Example:
\`\`\`
render_table({
  title: "Monthly Breakdown",
  columns: [{key: "month", label: "Month"}, {key: "expenses", label: "Expenses", align: "right"}, {key: "profit", label: "Profit", align: "right"}],
  rows: [{month: "January", expenses: 7981, profit: -10870}, ...]
})
\`\`\`

## Important Rules
- ALWAYS fetch fresh data before answering
- Cite specific numbers: "$X,XXX" not "a significant amount"
- Be direct and actionable
- When comparing periods, note if data is partial
- Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

## Expense Categorization
When analyzing the Expenses sheet, ALWAYS parse the description column (column 5) to categorize expenses into specific buckets:
- **Jennifer** — Labor/staffing costs (look for "Jennifer" in description)
- **Global Payments** — Payment processing fees (look for "Global Payments")
- **Delivery** — Delivery costs (column 3 "Delivery" field, or "delivery" in description)
- **Rent/Utilities** — Rent, utilities, electric, water
- **Truck/Gas** — Vehicle expenses, gas, truck maintenance
- **Food** — Food, meals, snacks for staff
- **Insurance** — Business insurance
- **Supplies** — Boxes, tape, packaging materials
- **Other/Uncategorized** — Everything else

When users ask about expenses or cost breakdown, ALWAYS:
1. Read the Expenses sheet
2. Parse each row's description to categorize
3. Show a pie chart or bar chart of expense categories
4. Show a table with the breakdown
5. Identify the top cost drivers and trends

For entries with multiple items in the description (e.g. "Global Payments + Jennifer (168)"), split them into their respective categories.`;

/* ── POST handler — agentic loop ───────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const userMessage: string = body?.message ?? "";
  const history: { role: string; content: string; blocks?: object[] }[] = body?.history ?? [];

  if (!userMessage.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey, timeout: 90000 });

  // Build message history (strip blocks for API, keep role/content)
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-16).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const encoder = new TextEncoder();
  const renders: object[] = [];
  let toolUsePhase = false;

  const readable = new ReadableStream({
    async start(controller) {
      const emit = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // Agentic loop: up to 6 iterations
        for (let iter = 0; iter < 6; iter++) {
          const isLastIter = iter === 5;

          const response = await openai.chat.completions.create({
            model: "gpt-5.4",
            messages,
            tools: isLastIter ? undefined : tools,
            temperature: 0.3,
            max_completion_tokens: 3500,
            stream: true,
          });

          let hasToolCalls = false;
          const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();
          let textContent = "";

          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            // Accumulate text
            if (delta.content) {
              textContent += delta.content;
              if (!toolUsePhase) {
                emit({ content: delta.content });
              }
            }

            // Accumulate tool calls
            if (delta.tool_calls) {
              hasToolCalls = true;
              toolUsePhase = true;
              for (const tc of delta.tool_calls) {
                const existing = toolCalls.get(tc.index);
                if (!existing) {
                  toolCalls.set(tc.index, {
                    id: tc.id || "",
                    name: tc.function?.name || "",
                    args: tc.function?.arguments || "",
                  });
                } else {
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name += tc.function.name;
                  if (tc.function?.arguments) existing.args += tc.function.arguments;
                }
              }
            }
          }

          // If no tool calls, we're done
          if (!hasToolCalls) {
            // Emit any accumulated renders
            for (const r of renders) {
              emit({ render: r });
            }
            break;
          }

          // Process tool calls
          // Add assistant message with tool_calls to history
          const assistantMsg: OpenAI.ChatCompletionMessageParam = {
            role: "assistant",
            content: textContent || null,
            tool_calls: Array.from(toolCalls.values()).map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.args },
            })),
          };
          messages.push(assistantMsg);

          // Status update
          const toolNames = Array.from(toolCalls.values()).map((tc) => tc.name);
          const readingSheets = toolNames.some((n) => n.startsWith("read_"));
          const rendering = toolNames.some((n) => n.startsWith("render_"));
          if (readingSheets) emit({ status: "Reading spreadsheet data…" });
          else if (rendering) emit({ status: "Generating visualizations…" });

          // Execute tools
          for (const [, tc] of Array.from(toolCalls.entries())) {
            let parsed: Record<string, unknown> = {};
            try {
              parsed = JSON.parse(tc.args || "{}");
            } catch { /* empty */ }

            const result = await executeTool(tc.name, parsed);

            if (result.render) {
              renders.push(result.render);
            }

            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result.result || "done",
            });
          }

          toolUsePhase = false;
        }

        emit({ done: true, renders });
        controller.close();
      } catch (err) {
        emit({ error: String(err) });
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
