import mongoose, { Schema, Document } from "mongoose";

export interface IEmailCampaign extends Document {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  templateType: string;
  status: "draft" | "scheduled" | "sent";
  sentAt: Date | null;
  recipientTags: string[];
  stats: { sent: number; opened: number; clicked: number; bounced: number };
  createdAt: Date;
}

const EmailCampaignSchema = new Schema<IEmailCampaign>({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  htmlContent: { type: String, default: "" },
  textContent: { type: String, default: "" },
  templateType: { type: String, default: "general" },
  status: { type: String, enum: ["draft", "scheduled", "sent"], default: "draft" },
  sentAt: { type: Date, default: null },
  recipientTags: [{ type: String }],
  stats: {
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.EmailCampaign || mongoose.model<IEmailCampaign>("EmailCampaign", EmailCampaignSchema);
