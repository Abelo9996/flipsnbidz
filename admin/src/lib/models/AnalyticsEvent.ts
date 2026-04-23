import mongoose, { Schema, Document } from "mongoose";

export interface IAnalyticsEvent extends Document {
  type: string;
  source: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
  type: { type: String, required: true },
  source: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

AnalyticsEventSchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>("AnalyticsEvent", AnalyticsEventSchema);
