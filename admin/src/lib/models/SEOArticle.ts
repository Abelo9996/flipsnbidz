import mongoose, { Schema, Document } from "mongoose";

export interface ISEOArticle extends Document {
  title: string;
  slug: string;
  keyword: string;
  content: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  status: "draft" | "published";
  publishedAt: Date | null;
  createdAt: Date;
}

const SEOArticleSchema = new Schema<ISEOArticle>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  keyword: { type: String, required: true },
  content: { type: String, default: "" },
  metaDescription: { type: String, default: "" },
  wordCount: { type: Number, default: 0 },
  keywordDensity: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  publishedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.SEOArticle || mongoose.model<ISEOArticle>("SEOArticle", SEOArticleSchema);
