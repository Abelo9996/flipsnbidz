import mongoose, { Schema, Document } from "mongoose";

export interface IAuctionLot extends Document {
  lotNumber: string;
  title: string;
  description: string;
  currentBid: number;
  numberOfBids: number;
  views: number;
  watches: number;
  timeLeft: string;
  category: string;
  auctionDate: Date;
  imageUrl: string;
  url: string;
  source: "hibid" | "offerup" | "fb";
  status: string;
  scrapedAt: Date;
  createdAt: Date;
}

const AuctionLotSchema = new Schema<IAuctionLot>({
  lotNumber: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  currentBid: { type: Number, default: 0 },
  numberOfBids: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  watches: { type: Number, default: 0 },
  timeLeft: { type: String, default: "" },
  category: { type: String, default: "uncategorized" },
  auctionDate: { type: Date },
  imageUrl: { type: String, default: "" },
  url: { type: String, default: "" },
  source: { type: String, enum: ["hibid", "offerup", "fb"], default: "hibid" },
  status: { type: String, default: "active" },
  scrapedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

AuctionLotSchema.index({ lotNumber: 1, auctionDate: 1 });
AuctionLotSchema.index({ category: 1 });
AuctionLotSchema.index({ views: -1 });
AuctionLotSchema.index({ watches: -1 });

export default mongoose.models.AuctionLot || mongoose.model<IAuctionLot>("AuctionLot", AuctionLotSchema);
