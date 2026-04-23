import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";
import OpenAI from "openai";

const OFFERUP_PROFILE_URL = "https://offerup.com/p/158714750";
const OFFERUP_USER_ID = "158714750";
const OFFERUP_GQL = "https://offerup.com/api/graphql";

const GQL_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": OFFERUP_PROFILE_URL,
  "Origin": "https://offerup.com",
};

interface ScrapedListing {
  id: string;
  title: string;
  price: string;
  state: string;
  imageUrl: string;
  photos: Array<{ detail?: { url?: string }; uuid?: string }>;
  locationDetails?: { locationName?: string };
}

async function categorizeOfferUpListings(items: { id: string; title: string }[]): Promise<Record<string, string>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "placeholder") return {};

  const openai = new OpenAI({ apiKey });
  const categories: Record<string, string> = {};
  const BATCH = 100;

  for (let i = 0; i < items.length; i += BATCH) {
    try {
      const batch = items.slice(i, i + BATCH);
      const res = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          {
            role: "system",
            content:
              'Categorize OfferUp resale items into one of: electronics, furniture, tools, appliances, kitchen, outdoor, clothing, toys, sports, home-decor, automotive, office, health-beauty, uncategorized. Return JSON only in the form {"listingId":"category"}.',
          },
          { role: "user", content: batch.map((it) => `${it.id}: ${it.title}`).join("\n") },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });
      Object.assign(categories, JSON.parse(res.choices[0].message.content || "{}"));
    } catch {
      /* skip failed batch */
    }
  }

  return categories;
}

// Fetch a page of listings via OfferUp's GraphQL API
async function fetchGqlPage(pageCursor: string | null): Promise<{ listings: ScrapedListing[]; nextCursor: string | null }> {
  const query = `query GetUserListings($userId: String!, $pageCursor: String) {
    userListings(userId: $userId, pageCursor: $pageCursor) {
      pageCursor
      listings { id title price state photos { detail { url } uuid } locationDetails { locationName } }
    }
  }`;
  try {
    const res = await fetch(OFFERUP_GQL, {
      method: "POST",
      headers: GQL_HEADERS,
      body: JSON.stringify({
        operationName: "GetUserListings",
        query,
        variables: { userId: OFFERUP_USER_ID, pageCursor },
      }),
    });
    if (!res.ok) return { listings: [], nextCursor: null };
    const data = await res.json();
    const ul = data?.data?.userListings;
    const listings = (ul?.listings || []) as ScrapedListing[];
    // If we get the same cursor back or no new listings, stop paginating
    const newCursor = ul?.pageCursor || null;
    const stop = !newCursor || listings.length === 0;
    return { listings, nextCursor: stop ? null : newCursor };
  } catch {
    return { listings: [], nextCursor: null };
  }
}

// Scrape all listings: page 1 from __NEXT_DATA__, then paginate via GraphQL
async function scrapeOfferUp(): Promise<{ listings: ScrapedListing[]; source: string }> {
  // Fetch the profile page for __NEXT_DATA__ (page 1 + initial cursor)
  let firstPageListings: ScrapedListing[] = [];
  let pageCursor: string | null = null;

  try {
    const res = await fetch(OFFERUP_PROFILE_URL, {
      headers: {
        "User-Agent": GQL_HEADERS["User-Agent"],
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    const html = await res.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      const nextData = JSON.parse(nextDataMatch[1]);
      const apolloState = nextData?.props?.pageProps?.initialApolloState;
      if (apolloState) {
        const rootQuery = apolloState["ROOT_QUERY"];
        const listingsKey = rootQuery ? Object.keys(rootQuery).find((k) => k.startsWith("userListings")) : null;
        if (listingsKey) {
          const entry = rootQuery[listingsKey];
          firstPageListings = (entry?.listings || []) as ScrapedListing[];
          pageCursor = entry?.pageCursor || null;
        }
      }
    }
  } catch { /* fall through to GQL-only */ }

  // Paginate via GraphQL to get remaining listings
  const allListings = [...firstPageListings];
  const seenIds = new Set(allListings.map(l => l.id));
  let cursor = pageCursor;
  let pages = 0;
  while (cursor && pages < 10) {
    const page = await fetchGqlPage(cursor);
    let newCount = 0;
    for (const l of page.listings) {
      if (!seenIds.has(l.id)) {
        allListings.push(l);
        seenIds.add(l.id);
        newCount++;
      }
    }
    // Stop if no new unique listings were found (OfferUp recycles the cursor)
    if (newCount === 0) break;
    cursor = page.nextCursor;
    pages++;
  }

  return { listings: allListings, source: allListings.length > 0 ? "next-data+gql" : "none" };
}

export async function GET() {
  try {
    await dbConnect();
    const lots = await AuctionLot.find({ source: "offerup" }).sort({ watches: -1, views: -1 }).limit(200).lean();
    const stats = {
      total: lots.length,
      active: lots.filter((l) => l.status === "active").length,
      sold: lots.filter((l) => l.status === "sold").length,
      totalViews: lots.reduce((s, l) => s + (l.views || 0), 0),
      totalWatches: lots.reduce((s, l) => s + (l.watches || 0), 0),
      avgPrice: lots.length ? lots.reduce((s, l) => s + l.currentBid, 0) / lots.length : 0,
    };
    return NextResponse.json({ lots, stats, profile: PROFILE_DATA });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));

    // Manual listing upsert (from UI form or bulk import)
    if (body.listings && Array.isArray(body.listings)) {
      const normalizedListings = body.listings.map((item: Record<string, unknown>) => ({
        id: String(item.id || item.url || Date.now()),
        title: String(item.title || ""),
        raw: item,
      }));
      const inferredCategories = await categorizeOfferUpListings(
        normalizedListings.map((entry: { id: string; title: string }) => ({ id: entry.id, title: entry.title }))
      );

      let saved = 0;
      for (const item of normalizedListings) {
        const raw = item.raw as Record<string, unknown>;
        await AuctionLot.findOneAndUpdate(
          { url: String(raw.url || ""), source: "offerup" },
          {
            $set: {
              lotNumber: String(raw.id || String(raw.url || "").split("/").pop() || Date.now()),
              title: String(raw.title || ""),
              currentBid: Number(raw.price || 0),
              views: Number(raw.views || 0),
              watches: Number(raw.watches || 0),
              imageUrl: String(raw.imageUrl || ""),
              url: String(raw.url || ""),
              status: String(raw.status || "active"),
              category: String(raw.category || inferredCategories[item.id] || "uncategorized"),
              source: "offerup",
              auctionDate: new Date(),
              scrapedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
        saved++;
      }
      return NextResponse.json({ success: true, saved, message: `Saved ${saved} OfferUp listings` });
    }

    // Auto-scrape attempt
    const { listings, source } = await scrapeOfferUp();

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        success: false,
        profile: PROFILE_DATA,
        message: "OfferUp blocks automated scraping. Use the manual import below to add your listings.",
        hint: "Copy your listing data from the OfferUp app/seller dashboard and paste into the manual import.",
      });
    }

    // Clear old offerup entries and replace with fresh data to avoid duplicates
    await AuctionLot.deleteMany({ source: "offerup" });

    const listingsToSave = listings.slice(0, 200);
    const inferredCategories = await categorizeOfferUpListings(
      listingsToSave.map((item) => ({ id: item.id, title: item.title }))
    );

    // Process scraped listings
    let saved = 0;
    for (const item of listingsToSave) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = item as any;
      const title = (raw.title || raw.name || String(raw)).trim();
      const price = parseFloat(raw.price) || raw.currentBid || 0;
      const imageUrl = raw.photos?.[0]?.detail?.url || (raw.photos?.[0]?.uuid ? `https://images.offerup.com/${raw.photos[0].uuid}/` : "");
      const url = raw.url || (raw.id ? `https://offerup.com/item/detail/${raw.id}` : "");
      const state = raw.state || raw.status || "";

      await AuctionLot.create({
        lotNumber: raw.id || String(saved),
        title,
        currentBid: price,
        views: raw.views || 0,
        watches: raw.watches || 0,
        imageUrl,
        url,
        description: raw.locationDetails?.locationName || "",
        status: state === "SOLD" ? "sold" : "active",
        category: inferredCategories[String(raw.id)] || "uncategorized",
        source: "offerup",
        auctionDate: new Date(),
        scrapedAt: new Date(),
      });
      saved++;
    }

    return NextResponse.json({
      success: true,
      source,
      saved,
      profile: PROFILE_DATA,
      message: `Synced ${saved} OfferUp listings (source: ${source}).`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Static profile data from OfferUp (938 sold, 174 reviews, 162 followers)
const PROFILE_DATA = {
  name: "Flips N Bidz",
  url: "https://offerup.com/p/158714750",
  location: "La Mirada / Santa Fe Springs, CA",
  joined: "Aug 2024",
  rating: 4.9,
  reviews: 174,
  sold: 938,
  followers: 162,
  compliments: {
    itemAsDescribed: 101,
    friendly: 115,
    onTime: 105,
    reliable: 110,
    communicative: 112,
  },
};
