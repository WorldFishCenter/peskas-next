import mongoose, { Schema, Types } from "mongoose";

export type TGearSummary = {
  _id: Types.ObjectId;
  BMU: string;
  gear: string;
  mean_effort: number;
  mean_cpue: number;
  mean_cpua: number;
  mean_rpue: number;
  mean_rpua: number;
  date: Date;
};

/**
 * Schema
 */
const gearSummarySchema = new Schema<TGearSummary>(
  {
    BMU: String,
    gear: String,
    mean_effort: Number,
    mean_cpue: Number,
    mean_cpua: Number,
    mean_rpue: Number,
    mean_rpua: Number,
    date: Date,
  },
  {
    collection: "gear_summaries",
  }
);

/**
 * Model
 */
export const GearSummaryModel =
  (mongoose.models.GearSummary as mongoose.Model<TGearSummary>) ??
  mongoose.model<TGearSummary>("GearSummary", gearSummarySchema);