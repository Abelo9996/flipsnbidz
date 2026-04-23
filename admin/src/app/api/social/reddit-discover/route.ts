import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";

export interface RedditPost {
  id: string;
  subreddit: string;
  subreddit_tier: "safe" | "caution" | "risky";
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  created_utc: number;
  flair: string;
  is_relevant: boolean;
  relevance_score: number;
}

const SUBREDDIT_TIERS = {
  safe: [
    { name: "Flipping", desc: "Reseller community — expects deal/auction content" },
    { name: "liquidation", desc: "Liquidation buyers — our core audience" },
    { name: "FlippingIncome", desc: "Flipping success stories and finds" },
  ],
  caution: [
    { name: "LAlist", desc: "LA classifieds — okay for local deals if not too frequent" },
    { name: "lalist", desc: "LA classifieds alternate" },
    { name: "GarageSale", desc: "Garage/estate sales — relevant but be subtle" },
    { name: "deals", desc: "General deals — okay if genuinely good prices" },
    { name: "DealsReddit", desc: "Deal sharing — okay if genuinely good prices" },
    { name: "thriftstorehauls", desc: "Thrift finds — engage naturally, don't promote" },
  ],
  risky: [
    { name: "orangecounty", desc: "⚠️ General community sub — promo posts get removed" },
    { name: "InlandEmpire", desc: "⚠️ General community sub — promo posts get removed" },
    { name: "LosAngeles", desc: "⚠️ Large community sub — strict self-promo rules" },
    { name: "SFV", desc: "⚠️ General community sub — promo likely flagged as spam" },
  ],
};

// Flat list for iteration
const ALL_SUBREDDITS: Array<{ name: string; tier: "safe" | "caution" | "risky" }> = [
  ...SUBREDDIT_TIERS.safe.map((s) => ({ name: s.name, tier: "safe" as const })),
  ...SUBREDDIT_TIERS.caution.map((s) => ({ name: s.name, tier: "caution" as const })),
  ...SUBREDDIT_TIERS.risky.map((s) => ({ name: s.name, tier: "risky" as const })),
];

const SUBREDDIT_NAMES = ALL_SUBREDDITS.map((s) => s.name);

function getTier(subreddit: string): "safe" | "caution" | "risky" {
  const found = ALL_SUBREDDITS.find((s) => s.name.toLowerCase() === subreddit.toLowerCase());
  return found?.tier ?? "caution";
}

const SEARCH_QUERIES = [
  "liquidation",
  "auction",
  "pallet",
  "wholesale",
  "resell",
  "la mirada",
  "deals near me",
];



function extractInventoryTerms(titles: string[]): string[] {
  const stopwords = new Set([
    "the","a","an","and","or","of","in","at","to","for","with","is","are","was",
    "be","been","has","have","had","that","this","it","its","on","by","from","as",
    "lot","item","items","pcs","set","pack","new","used","lot#","no","num","quantity",
  ]);
  const terms = new Set<string>();
  for (const title of titles) {
    const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
    for (const word of words) {
      if (word.length >= 4 && !stopwords.has(word) && !/^\d+$/.test(word)) {
        terms.add(word);
      }
    }
    // Also add 2-word phrases (bigrams) for better matching
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (words[i].length >= 3 && words[i + 1].length >= 3 &&
          !stopwords.has(words[i]) && !stopwords.has(words[i + 1])) {
        terms.add(bigram);
      }
    }
  }
  return Array.from(terms);
}

function scoreRelevance(title: string, selftext: string, inventoryTerms: string[]): number {
  const text = (title + " " + selftext).toLowerCase();
  let score = 0;
  let matches = 0;

  for (const term of inventoryTerms) {
    if (text.includes(term)) {
      // Longer/phrase matches score higher
      score += term.includes(" ") ? 15 : 8;
      matches++;
      if (matches >= 10) break; // cap to avoid runaway scores
    }
  }

  // Clamp to 0-100
  return Math.min(100, score);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CacheEntry {
  posts: RedditPost[];
  lastFetched: string;
}

let cache: CacheEntry | null = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchInventoryTerms(): Promise<string[]> {
  try {
    await dbConnect();
    const lots = await AuctionLot.find({ status: "active" })
      .select("title category")
      .limit(600)
      .lean();

    const titles: string[] = [];
    for (const lot of lots) {
      if (lot.title) titles.push(String(lot.title));
      if (lot.category) titles.push(String(lot.category));
    }

    if (titles.length > 0) return extractInventoryTerms(titles);
  } catch {
    // no-op
  }
  // No hardcoded fallback terms: if we have no live inventory context, return empty.
  return [];
}

async function fetchSubredditNew(subreddit: string, tier: "safe" | "caution" | "risky", inventoryTerms: string[]): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=15`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "FlipsAndBidz/1.0 (social discovery bot; contact flipsandbidz@gmail.com)",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("rate_limited");
    return [];
  }

  const data = await res.json();
  const children = data?.data?.children ?? [];

  return children.map((child: { data: { id: string; subreddit: string; title: string; selftext: string; author: string; score: number; num_comments: number; permalink: string; created_utc: number; link_flair_text: string } }) => {
    const p = child.data;
    const relevance_score = scoreRelevance(p.title, p.selftext || "", inventoryTerms);
    return {
      id: `t3_${p.id}`,
      subreddit: p.subreddit,
      subreddit_tier: tier,
      title: p.title,
      selftext: (p.selftext || "").slice(0, 300),
      author: p.author,
      score: p.score,
      num_comments: p.num_comments,
      url: `https://www.reddit.com${p.permalink}`,
      created_utc: p.created_utc,
      flair: p.link_flair_text || "",
      relevance_score,
      is_relevant: relevance_score >= 20,
    };
  });
}

async function fetchAll(inventoryTerms: string[]): Promise<RedditPost[]> {
  const all: RedditPost[] = [];
  const seen = new Set<string>();

  for (const { name: subreddit, tier } of ALL_SUBREDDITS) {
    try {
      const posts = await fetchSubredditNew(subreddit, tier, inventoryTerms);
      for (const post of posts) {
        if (!seen.has(post.id)) {
          seen.add(post.id);
          all.push(post);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "rate_limited") {
        await delay(5000);
      }
    }
    await delay(500);
  }

  // Also do a few keyword searches on top subreddits
  const searchSubreddits = ["Flipping", "liquidation", "LosAngeles", "orangecounty"];
  for (const sub of searchSubreddits) {
    const tier = getTier(sub);
    for (const query of SEARCH_QUERIES.slice(0, 3)) {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=new&t=week&limit=10`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "FlipsAndBidz/1.0 (social discovery bot; contact flipsandbidz@gmail.com)",
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          await delay(2000);
          continue;
        }
        const data = await res.json();
        const children = data?.data?.children ?? [];
        for (const child of children) {
          const p = child.data;
          const id = `t3_${p.id}`;
          if (!seen.has(id)) {
            seen.add(id);
            const relevance_score = scoreRelevance(p.title, p.selftext || "", inventoryTerms);
            all.push({
              id,
              subreddit: p.subreddit,
              subreddit_tier: tier,
              title: p.title,
              selftext: (p.selftext || "").slice(0, 300),
              author: p.author,
              score: p.score,
              num_comments: p.num_comments,
              url: `https://www.reddit.com${p.permalink}`,
              created_utc: p.created_utc,
              flair: p.link_flair_text || "",
              relevance_score,
              is_relevant: relevance_score >= 20,
            });
          }
        }
      } catch {
        // skip on error
      }
      await delay(500);
    }
  }

  return all;
}

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  const now = Date.now();

  if (!refresh && cache && now - cacheTime < CACHE_TTL) {
    return NextResponse.json({
      posts: cache.posts,
      subreddits: SUBREDDIT_NAMES,
      subredditTiers: SUBREDDIT_TIERS,
      lastFetched: cache.lastFetched,
      cached: true,
    });
  }

  try {
    // Fetch inventory terms once, then reuse for all post scoring
    const inventoryTerms = await fetchInventoryTerms();
    const posts = await fetchAll(inventoryTerms);
    const lastFetched = new Date().toISOString();
    cache = { posts, lastFetched };
    cacheTime = now;

    return NextResponse.json({
      posts,
      subreddits: SUBREDDIT_NAMES,
      subredditTiers: SUBREDDIT_TIERS,
      lastFetched,
      cached: false,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
