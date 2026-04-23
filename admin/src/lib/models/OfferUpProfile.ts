import mongoose, { Schema } from "mongoose";

const OfferUpProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    name: String,
    url: String,
    location: String,
    joined: String,
    rating: Number,
    reviews: Number,
    sold: Number,
    followers: Number,
    compliments: {
      itemAsDescribed: Number,
      friendly: Number,
      onTime: Number,
      reliable: Number,
      communicative: Number,
    },
    raw: Schema.Types.Mixed,
    scrapedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.OfferUpProfile ||
  mongoose.model("OfferUpProfile", OfferUpProfileSchema);
