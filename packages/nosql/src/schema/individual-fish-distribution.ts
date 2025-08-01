import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

export type TIndividualFishDistribution = {
  _id: Types.ObjectId;
  landing_site: string;
  date: Date;
  fisher_id: string;
  fish_category: string;
  mean_catch_kg: number;
};

const individualFishDistributionSchema = new Schema<TIndividualFishDistribution>(
  {
    landing_site: { type: String, required: true },
    date: { type: Date, required: true },
    fisher_id: { type: String, required: true },
    fish_category: { type: String, required: true },
    mean_catch_kg: { type: Number, required: true, default: 0 },
  },
  {
    collection: "individual_fish_distribution",
  }
);

export const IndividualFishDistributionModel =
  (mongoose.models.IndividualFishDistribution as mongoose.Model<TIndividualFishDistribution>) ??
  mongoose.model<TIndividualFishDistribution>("IndividualFishDistribution", individualFishDistributionSchema); 