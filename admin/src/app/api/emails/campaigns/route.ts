import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmailCampaign from "@/lib/models/EmailCampaign";

export async function GET() {
  try {
    await dbConnect();
    const campaigns = await EmailCampaign.find().sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const campaign = await EmailCampaign.create(data);
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
