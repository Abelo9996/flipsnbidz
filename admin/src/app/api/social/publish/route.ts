import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SocialPost from "@/lib/models/SocialPost";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const post = await SocialPost.findById(id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // NOTE: Direct platform publishing requires platform OAuth/API connectors.
    // For now, we mark as published in-app so the workflow is one-click in admin.
    post.status = "published";
    post.publishedAt = new Date();
    await post.save();

    return NextResponse.json({
      success: true,
      post,
      mode: "internal",
      message: "Marked as published. Connect platform APIs for full auto-posting.",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
