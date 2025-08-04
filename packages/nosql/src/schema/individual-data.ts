import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type TIndividualStats = {
  _id: Types.ObjectId;
  BMU: string;
  date: Date;
  fisher_id: string;
  mean_cpue: number;
  mean_rpue: number;
  mean_price_kg: number;
  mean_cost: number;
  mean_profit: number;
};

/**
 * Schema
 */
const individualStatsSchema = new Schema<TIndividualStats>(
  {
    BMU: { type: String, required: true },
    date: { type: Date, required: true },
    fisher_id: { type: String, required: true },
    mean_cpue: { type: Number, required: true },
    mean_rpue: { type: Number, required: true },
    mean_price_kg: { type: Number, required: true },
    mean_cost: { type: Number, required: true },
    mean_profit: { type: Number, required: true },
  },
  {
    collection: "individual_stats",
  }
);

/**
 * Model
 */
export const IndividualStatsModel =
  (mongoose.models.IndividualStats as mongoose.Model<TIndividualStats>) ??
  mongoose.model<TIndividualStats>("IndividualStats", individualStatsSchema); 