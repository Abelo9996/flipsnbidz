import mongoose, { Schema, Document } from "mongoose";

export interface ISubscriber extends Document {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  tags: string[];
  source: string;
  status: "active" | "unsubscribed";
  subscribedAt: Date;
  lastEmailedAt: Date | null;
}

const SubscriberSchema = new Schema<ISubscriber>({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  phone: { type: String, default: "" },
  tags: [{ type: String }],
  source: { type: String, default: "manual" },
  status: { type: String, enum: ["active", "unsubscribed"], default: "active" },
  subscribedAt: { type: Date, default: Date.now },
  lastEmailedAt: { type: Date, default: null },
});

export default mongoose.models.Subscriber || mongoose.model<ISubscriber>("Subscriber", SubscriberSchema);
