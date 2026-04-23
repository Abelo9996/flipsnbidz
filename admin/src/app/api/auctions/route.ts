import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const source = searchParams.get("source");

    const filter: Record<string, unknown> = {};
    if (category && category !== "all") filter.category = category;
    if (status && status !== "all") filter.status = status;
    if (source) filter.source = source;
    else filter.source = { $ne: "offerup" }; // default: only show hibid lots
    if (search) filter.title = { $regex: search, $options: "i" };

    const [lots, total] = await Promise.all([
      AuctionLot.find(filter)
        .sort({ lotNumber: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuctionLot.countDocuments(filter),
    ]);

    // Check staleness — when was the most recent scrape?
    const newest = await AuctionLot.findOne({ source: "hibid" }).sort({ scrapedAt: -1 }).lean();
    const lastScrapedAt = newest?.scrapedAt || null;

    return NextResponse.json({ lots, total, page, pages: Math.ceil(total / limit), lastScrapedAt });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
