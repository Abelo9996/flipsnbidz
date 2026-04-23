import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";
import { promises as fs } from "fs";
import path from "path";

const ADMIN_ROOT = process.cwd();
const DATA_DIR = path.join(ADMIN_ROOT, "data");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");
const EMAIL_SENDER_SCRIPT = path.join(ADMIN_ROOT, "scripts", "email_sender.py");

export async function GET() {
  try {
    await dbConnect();

    const [activeLots, offerupLots, topLots] = await Promise.all([
      AuctionLot.countDocuments({ source: "hibid", status: "active" }),
      AuctionLot.countDocuments({ source: "offerup", status: "active" }),
      AuctionLot.find({ source: "hibid", status: "active" })
        .sort({ numberOfBids: -1, views: -1 })
        .limit(5)
        .select("title currentBid")
        .lean(),
    ]);

    let contactsCount = 0;
    try {
      const raw = await fs.readFile(CONTACTS_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, string>;
      contactsCount = Object.keys(parsed).length;
    } catch {
      contactsCount = 0;
    }

    const highlights = topLots
      .map((l) => `${l.title} ($${Number(l.currentBid || 0).toFixed(0)})`)
      .join(", ");

    const smsBody = activeLots > 0
      ? `Flips & Bidz: New auction is live with ${activeLots} lots. Bid now: https://flipsandbidz.hibid.com/lots`
      : "Flips & Bidz auction update: Check latest lots at https://flipsandbidz.hibid.com/lots";

    return NextResponse.json({
      activeLots,
      offerupLots,
      contactsCount,
      topLots,
      highlights,
      defaults: { smsBody },
      contactsFile: CONTACTS_FILE,
      emailScript: EMAIL_SENDER_SCRIPT,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
