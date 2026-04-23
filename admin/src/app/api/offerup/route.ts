import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";
import OfferUpProfile from "@/lib/models/OfferUpProfile";
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
        model: "gpt-4o",
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

type ScrapedProfile = Partial<{
  name: string;
  url: string;
  location: string;
  joined: string;
  rating: number | null;
  reviews: number | null;
  sold: number | null;
  followers: number | null;
  compliments: {
    itemAsDescribed: number | null;
    friendly: number | null;
    onTime: number | null;
    reliable: number | null;
    communicative: number | null;
  };
  raw: unknown;
}>;

const PROFILE_DEFAULTS = {
  name: "Flips N Bidz",
  url: OFFERUP_PROFILE_URL,
  location: "",
  joined: "",
  rating: null,
  reviews: null,
  sold: null,
  followers: null,
  compliments: {
    itemAsDescribed: null,
    friendly: null,
    onTime: null,
    reliable: null,
    communicative: null,
  },
} as const;

function stripLegacyStaticProfile(profile: Record<string, unknown>): Record<string, unknown> {
  const next = { ...profile };
  const compliments = (next.compliments as Record<string, unknown> | undefined) || {};
  const matchesLegacySeed =
    next.rating === 4.9 &&
    next.reviews === 174 &&
    next.sold === 938 &&
    next.followers === 162 &&
    compliments.itemAsDescribed === 101 &&
    compliments.friendly === 115 &&
    compliments.onTime === 105 &&
    compliments.reliable === 110 &&
    compliments.communicative === 112;

  if (!matchesLegacySeed) return next;

  next.rating = null;
  next.reviews = null;
  next.sold = null;
  next.followers = null;
  next.compliments = {
    itemAsDescribed: null,
    friendly: null,
    onTime: null,
    reliable: null,
    communicative: null,
  };

  return next;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  return undefined;
}

// Walk apolloState to find a "User"-typed entity for the profile owner, then
// pluck likely fields. OfferUp's schema has shifted over time, so be defensive.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractProfileFromApollo(apolloState: Record<string, any>): ScrapedProfile {
  const profile: ScrapedProfile = {};
  if (!apolloState) return profile;

  const userKey =
    Object.keys(apolloState).find((k) => k === `User:${OFFERUP_USER_ID}`) ||
    Object.keys(apolloState).find(
      (k) => apolloState[k]?.__typename === "User" && String(apolloState[k]?.id) === OFFERUP_USER_ID
    ) ||
    Object.keys(apolloState).find((k) => apolloState[k]?.__typename === "User");

  const user = userKey ? apolloState[userKey] : null;
  if (!user) return profile;
  profile.raw = user;

  if (typeof user.name === "string") profile.name = user.name;
  if (typeof user.displayName === "string" && !profile.name) profile.name = user.displayName;
  if (typeof user.location === "string") profile.location = user.location;
  if (typeof user.locationName === "string" && !profile.location) profile.location = user.locationName;

  // Joined date: could be string, ISO, or epoch
  const joinedRaw = user.dateJoined ?? user.joinedDate ?? user.memberSince ?? user.createdAt;
  if (joinedRaw) {
    const d = new Date(joinedRaw);
    profile.joined = isNaN(d.getTime())
      ? String(joinedRaw)
      : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // Rating + reviews: may be nested under `rating`, `ratings`, or flat
  const ratingObj = user.rating ?? user.ratings ?? user.sellerRating ?? null;
  profile.rating =
    num(ratingObj?.average) ?? num(ratingObj?.value) ?? num(user.averageRating) ?? num(user.rating);
  profile.reviews =
    num(ratingObj?.count) ?? num(user.reviewCount) ?? num(user.reviewsCount) ?? num(user.numReviews);

  profile.sold =
    num(user.itemsSold) ??
    num(user.soldCount) ??
    num(user.transactionCounts?.sold) ??
    num(user.stats?.itemsSold);
  profile.followers =
    num(user.followerCount) ?? num(user.followersCount) ?? num(user.numFollowers);

  const c = user.compliments || user.sellerCompliments || {};
  profile.compliments = {
    itemAsDescribed: num(c.itemAsDescribed) ?? 0,
    friendly: num(c.friendly) ?? 0,
    onTime: num(c.onTime) ?? num(c.punctual) ?? 0,
    reliable: num(c.reliable) ?? 0,
    communicative: num(c.communicative) ?? num(c.responsive) ?? 0,
  };

  profile.url = OFFERUP_PROFILE_URL;
  return profile;
}

// Scrape all listings + profile: page 1 from __NEXT_DATA__, then paginate via GraphQL
async function scrapeOfferUp(): Promise<{ listings: ScrapedListing[]; profile: ScrapedProfile; source: string }> {
  // Fetch the profile page for __NEXT_DATA__ (page 1 + initial cursor)
  let firstPageListings: ScrapedListing[] = [];
  let pageCursor: string | null = null;
  let scrapedProfile: ScrapedProfile = {};

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
        scrapedProfile = extractProfileFromApollo(apolloState);
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

  return { listings: allListings, profile: scrapedProfile, source: allListings.length > 0 ? "next-data+gql" : "none" };
}

// Merge scraped fields onto existing/cached profile so blank fields don't overwrite good ones.
async function persistProfile(scraped: ScrapedProfile): Promise<Record<string, unknown>> {
  const existing = await OfferUpProfile.findOne({ userId: OFFERUP_USER_ID }).lean();
  const merged: Record<string, unknown> = stripLegacyStaticProfile({
    ...PROFILE_DEFAULTS,
    ...(existing || {}),
  });
  for (const [k, v] of Object.entries(scraped)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      merged[k] = { ...((merged[k] as object) || {}), ...v };
    } else {
      merged[k] = v;
    }
  }
  merged.userId = OFFERUP_USER_ID;
  merged.scrapedAt = new Date();
  await OfferUpProfile.findOneAndUpdate(
    { userId: OFFERUP_USER_ID },
    { $set: merged },
    { upsert: true, new: true }
  );
  return merged;
}

async function getProfile(): Promise<Record<string, unknown>> {
  const existing = await OfferUpProfile.findOne({ userId: OFFERUP_USER_ID }).lean();
  if (existing) {
    return stripLegacyStaticProfile({ ...PROFILE_DEFAULTS, ...existing });
  }
  return { ...PROFILE_DEFAULTS };
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
    const profile = await getProfile();
    return NextResponse.json({ lots, stats, profile });
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
    const { listings, profile: scrapedProfile, source } = await scrapeOfferUp();

    // Persist whatever profile fields we got (even if listings failed)
    const profile = Object.keys(scrapedProfile).length
      ? await persistProfile(scrapedProfile)
      : await getProfile();

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        success: false,
        profile,
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
      profile,
      message: `Synced ${saved} OfferUp listings (source: ${source}).`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

