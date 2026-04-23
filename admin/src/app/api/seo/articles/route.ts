import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SEOArticle from "@/lib/models/SEOArticle";

export async function GET() {
  try {
    await dbConnect();
    const articles = await SEOArticle.find().sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const article = await SEOArticle.create(data);
    return NextResponse.json({ success: true, article });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const { id, ...update } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const article = await SEOArticle.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, article });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
