import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

export type TIndividualGearStats = {
  _id: Types.ObjectId;
  BMU: string;
  date: Date;
  gear: string;
  fisher_id: string;
  mean_cpue: number;
  mean_rpue: number;
  mean_price_kg: number;
  mean_costs: number;
  mean_profit: number;
};

const individualGearStatsSchema = new Schema<TIndividualGearStats>(
  {
    BMU: { type: String, required: true },
    date: { type: Date, required: true },
    gear: { type: String, required: true },
    fisher_id: { type: String, required: true },
    mean_cpue: { type: Number, required: true },
    mean_rpue: { type: Number, required: true },
    mean_price_kg: { type: Number, required: true },
    mean_costs: { type: Number, required: true },
    mean_profit: { type: Number, required: true },
  },
  { collection: "individual_gear_stats" }
);

export const IndividualGearStatsModel =
  mongoose.models.IndividualGearStats || mongoose.model<TIndividualGearStats>("IndividualGearStats", individualGearStatsSchema); 