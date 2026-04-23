import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SocialPost from "@/lib/models/SocialPost";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    if (platform && platform !== "all") filter.platform = platform;

    const posts = await SocialPost.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const post = await SocialPost.create(data);
    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const post = await SocialPost.findByIdAndUpdate(id, { $set: updates }, { new: true });
    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await SocialPost.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
