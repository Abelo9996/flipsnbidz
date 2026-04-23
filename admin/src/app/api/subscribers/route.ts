import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Subscriber from "@/lib/models/Subscriber";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {};
    if (tag && tag !== "all") filter.tags = tag;
    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const subscribers = await Subscriber.find(filter).sort({ subscribedAt: -1 }).limit(200).lean();
    const total = await Subscriber.countDocuments(filter);
    return NextResponse.json({ subscribers, total });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();

    // Support bulk import
    if (Array.isArray(data)) {
      const results = await Promise.allSettled(
        data.map((s) =>
          Subscriber.findOneAndUpdate({ email: s.email }, { $set: s }, { upsert: true, new: true })
        )
      );
      const success = results.filter((r) => r.status === "fulfilled").length;
      return NextResponse.json({ success: true, imported: success, total: data.length });
    }

    const subscriber = await Subscriber.create(data);
    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { id } = await req.json();
    await Subscriber.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
