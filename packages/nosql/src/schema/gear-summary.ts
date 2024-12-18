import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type TGearSummary = {
  _id: Types.ObjectId;
  BMU: string;
  gear: string;
  mean_trip_catch: number;
  mean_effort: number;
  mean_cpue: number;
  mean_cpua: number;
};

/**
 * Schema
 */
const gearSummarySchema = new Schema<TGearSummary>(
  {
    BMU: String,
    gear: String,
    mean_trip_catch: Number,
    mean_effort: Number,
    mean_cpue: Number,
    mean_cpua: Number,
  },
  {
    collection: "gear_summaries",
  },
);

/**
 * Model
 */
export const GearSummaryModel =
  (mongoose.models.GearSummary as mongoose.Model<TGearSummary>) ??
  mongoose.model<TGearSummary>("GearSummary", gearSummarySchema);