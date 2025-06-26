import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type TCatchMonthly = {
  _id: Types.ObjectId;
  BMU: string;
  date: Date;
  mean_effort?: number;
  mean_cpue?: number;
  mean_cpua?: number;
  mean_rpue?: number;
  mean_rpua?: number;
  fdays?: number;
};

/**
 * Schema
 */
const catchMonthlySchema = new Schema<TCatchMonthly>(
  {
    BMU: String,
    date: Date,
    mean_effort: Number,
    mean_cpue: Number,
    mean_cpua: Number,
    mean_rpue: Number,
    mean_rpua: Number,
    fdays: Number,
  },
  {
    collection: "catch_monthly",
  },
);

/**
 * Model
 */
export const CatchMonthlyModel =
  (mongoose.models.CatchMonthly as mongoose.Model<TCatchMonthly>) ??
  mongoose.model<TCatchMonthly>("CatchMonthly", catchMonthlySchema);
