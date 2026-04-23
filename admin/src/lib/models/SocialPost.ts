import mongoose, { Schema, Document } from "mongoose";

export interface ISocialPost extends Document {
  platform: "instagram" | "reddit" | "facebook" | "nextdoor";
  content: string;
  hashtags: string[];
  imageUrl: string;
  generatedImageUrl: string;
  status: "draft" | "scheduled" | "published";
  scheduledFor: Date | null;
  publishedAt: Date | null;
  relatedAuctionLots: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const SocialPostSchema = new Schema<ISocialPost>({
  platform: { type: String, enum: ["instagram", "reddit", "facebook", "nextdoor"], required: true },
  content: { type: String, required: true },
  hashtags: [{ type: String }],
  imageUrl: { type: String, default: "" },
  generatedImageUrl: { type: String, default: "" },
  status: { type: String, enum: ["draft", "scheduled", "published"], default: "draft" },
  scheduledFor: { type: Date, default: null },
  publishedAt: { type: Date, default: null },
  relatedAuctionLots: [{ type: Schema.Types.ObjectId, ref: "AuctionLot" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.SocialPost || mongoose.model<ISocialPost>("SocialPost", SocialPostSchema);
