import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type TFishDistribution = {
  _id: Types.ObjectId;
  landing_site: string;
  date: Date;
  fish_category: string;
  total_catch_kg: number;
};

/**
 * Schema
 */
const fishDistributionSchema = new Schema<TFishDistribution>(
  {
    landing_site: { type: String, required: true },
    date: { type: Date, required: true },
    fish_category: { type: String, required: true },
    total_catch_kg: { type: Number, required: true, default: 0 },
  },
  {
    collection: "fish_distribution",
  }
);

/**
 * Model
 */
export const FishDistributionModel =
  (mongoose.models.FishDistribution as mongoose.Model<TFishDistribution>) ??
  mongoose.model<TFishDistribution>("FishDistribution", fishDistributionSchema); 