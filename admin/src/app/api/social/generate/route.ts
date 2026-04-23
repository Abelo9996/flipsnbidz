import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";

/* ── Business context builder ──────────────────────────────────────────── */
async function getBusinessContext(): Promise<string> {
  await dbConnect();

  const [auctionLots, offerupLots] = await Promise.all([
    AuctionLot.find({ source: { $ne: "offerup" }, status: "active" })
      .sort({ numberOfBids: -1 })
      .limit(50)
      .select("title currentBid numberOfBids views watches category")
      .lean(),
    AuctionLot.find({ source: "offerup", status: "active" })
      .sort({ currentBid: -1 })
      .limit(30)
      .select("title currentBid category")
      .lean(),
  ]);

  const totalAuction = await AuctionLot.countDocuments({ source: { $ne: "offerup" }, status: "active" });
  const totalOfferup = await AuctionLot.countDocuments({ source: "offerup", status: "active" });

  // Category breakdown
  const catMap: Record<string, { count: number; topBid: number }> = {};
  for (const lot of auctionLots) {
    const cat = lot.category || "other";
    if (!catMap[cat]) catMap[cat] = { count: 0, topBid: 0 };
    catMap[cat].count++;
    catMap[cat].topBid = Math.max(catMap[cat].topBid, lot.currentBid || 0);
  }

  // Hot items (most bids/views)
  const hotItems = auctionLots
    .filter(l => (l.numberOfBids || 0) > 0)
    .slice(0, 10)
    .map(l => `• ${l.title} — $${l.currentBid} (${l.numberOfBids} bids, ${l.views} views)`);

  // Best deals (low bid, high views)
  const deals = auctionLots
    .filter(l => l.currentBid < 50 && (l.views || 0) > 5)
    .slice(0, 5)
    .map(l => `• ${l.title} — only $${l.currentBid}`);

  // OfferUp highlights
  const offerupHighlights = offerupLots
    .slice(0, 8)
    .map(l => `• ${l.title} — $${l.currentBid}`);

  const categories = Object.entries(catMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([cat, info]) => `• ${cat}: ${info.count} lots (top bid: $${info.topBid})`);

  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const isAuctionDay = dayOfWeek === "Monday";
  const isBidDay = ["Friday", "Saturday", "Sunday"].includes(dayOfWeek);

  return `## Current Business State (Live Data)

**Auction Inventory:** ${totalAuction} active HiBid lots
**OfferUp Inventory:** ${totalOfferup} active listings
**Today:** ${dayOfWeek}${isAuctionDay ? " — AUCTION CLOSES TONIGHT!" : ""}${isBidDay ? " — Weekend bidding window, great time to promote" : ""}

### Hot Auction Items (Most Popular)
${hotItems.length > 0 ? hotItems.join("\n") : "No active bids yet"}

### Great Deals (Under $50)
${deals.length > 0 ? deals.join("\n") : "No low-bid items currently"}

### Categories Available
${categories.join("\n")}

### OfferUp Highlights
${offerupHighlights.length > 0 ? offerupHighlights.join("\n") : "No OfferUp listings"}

### Business Info
- **Name:** Flips & Bidz
- **Location:** 15300 Valley View Ave, La Mirada, CA 90638
- **Areas Served:** La Mirada, Santa Fe Springs, Whittier, Norwalk, Cerritos, Buena Park
- **Auction Site:** flipsandbidz.hibid.com
- **OfferUp:** offerup.com/p/158714750
- **Schedule:** Auctions close Monday evenings, new auctions posted weekly
- **What We Sell:** Amazon returns, Lowes overstock, Target liquidation, home goods, tools, electronics, furniture
`;
}

/* ── Platform-specific prompts ─────────────────────────────────────────── */
const PLATFORM_PROMPTS: Record<string, string> = {
  instagram: `Generate an Instagram post.
Rules:
- Engaging caption with emojis, 100-150 words
- Highlight 2-3 specific items with prices from the hot items
- Include a call-to-action: "Link in bio" or "Bid now at flipsandbidz.hibid.com"
- Mention La Mirada, CA
- 15-20 relevant hashtags (mix of #liquidation #auction #deals #laMirada #reseller + category-specific)
- If it's Monday, create urgency ("Auction closes TONIGHT!")
- If it's weekend, encourage bidding

Return JSON: { "caption": "...", "hashtags": ["..."] }`,

  facebook: `Generate a Facebook post.
Rules:
- Casual, community-friendly tone (like talking to neighbors)
- Highlight 3-4 specific items with prices
- Mention location (La Mirada) and hours
- Include flipsandbidz.hibid.com link naturally
- Encourage sharing ("Know someone who needs a [item]? Tag them!")
- If Monday: "Last chance to bid — auction closes tonight!"
- Keep it conversational, 80-120 words
- 3-5 hashtags max (Facebook doesn't use many)

Return JSON: { "caption": "...", "hashtags": ["..."] }`,

  reddit: `Generate a Reddit post for the most appropriate subreddit.
Rules:
- Title should be informative, not clickbait
- Content should provide genuine value (deal info, reseller tips, etc.)
- Only suggest SAFE subreddits: r/Flipping, r/liquidation, r/FlippingIncome, r/LAlist, r/orangecounty, r/InlandEmpire, r/LosAngeles, r/deals, r/GarageSale
- For r/Flipping: frame as a source/find for resellers
- For r/liquidation: share what's available this week
- Sound like a real community member, not a business account
- Mention specific items and prices
- Include flipsandbidz.hibid.com only once, naturally
- 150-250 words

Return JSON: { "title": "...", "content": "...", "subreddits": ["..."] }`,

  nextdoor: `Generate a Nextdoor post.
Rules:
- Hyper-local, neighbor-to-neighbor tone
- "Hey neighbors!" style opening
- Mention 2-3 interesting items with prices
- Emphasize local pickup in La Mirada
- Keep it SHORT (3-5 sentences max)
- No hashtags on Nextdoor
- Sound like a real local business owner, not a marketer

Return JSON: { "caption": "...", "hashtags": [] }`,

  tiktok: `Generate a TikTok video script/caption.
Rules:
- Hook in first line ("Wait till you see what $5 gets you at a liquidation auction 👀")
- Short, punchy, trend-aware
- Include 3-4 specific items that would be visually interesting
- Call-to-action: "Link in bio" or "Comment for details"
- 8-12 trending hashtags (#liquidation #auction #deals #reseller #flipper #amazonreturns)
- Under 80 words for caption

Return JSON: { "caption": "...", "hashtags": ["..."], "hook": "..." }`,
};

/* ── Smart suggestion engine ───────────────────────────────────────────── */
async function generateSuggestions(context: string): Promise<object[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a social media strategist for a liquidation auction business. Based on the current business state, suggest 3-5 social media posts that should be created RIGHT NOW.

Consider:
- Day of week (Monday = auction closing, good urgency posts; Weekend = bid encouragement)
- Hot items that would get engagement
- Mix of platforms (don't suggest all Instagram)
- Reddit opportunities if there are relevant items
- What would actually drive bids/sales

Return JSON array: [{ "platform": "...", "idea": "short description", "urgency": "high|medium|low", "reason": "why this post now" }]`,
      },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 500,
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    return parsed.suggestions || parsed.ideas || (Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

/* ── POST handler ──────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { platform, items, customNote, action } = await req.json();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const context = await getBusinessContext();

    // Return suggestions if requested
    if (action === "suggest") {
      const suggestions = await generateSuggestions(context);
      return NextResponse.json({ success: true, suggestions });
    }

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram;

    // If specific items were selected, add them to context
    let itemOverride = "";
    if (items?.length) {
      const itemList = items
        .map((i: { title: string; currentBid: number }) => `- ${i.title} ($${i.currentBid})`)
        .join("\n");
      itemOverride = `\n\n## FEATURED ITEMS (user selected these specifically)\n${itemList}\nFocus the post on these items.`;
    }

    const noteText = customNote ? `\n\n## ADDITIONAL CONTEXT FROM USER\n${customNote}` : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert social media manager for Flips & Bidz. You create engaging, platform-native content that drives real engagement and sales. You never sound like a bot or generic AI. Every post feels like it was written by someone who genuinely knows and loves the business.`,
        },
        {
          role: "user",
          content: `${context}${itemOverride}${noteText}\n\n---\n\n${platformPrompt}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 800,
    });

    const content = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json({ success: true, content, platform });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
