import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type TIndividualData = {
  _id: Types.ObjectId;
  date: Date;
  BMU: string;
  gear: string;
  fisher_id: string;
  fisher_cpue: number;
  fisher_rpue: number;
  fisher_cost: number;
};

/**
 * Schema
 */
const individualDataSchema = new Schema<TIndividualData>(
  {
    date: { type: Date, required: true },
    BMU: { type: String, required: true },
    gear: { type: String, required: true },
    fisher_id: { type: String, required: true },
    fisher_cpue: { type: Number, required: true },
    fisher_rpue: { type: Number, required: true },
    fisher_cost: { type: Number, required: true },
  },
  {
    collection: "individual_data",
  }
);

/**
 * Model
 */
export const IndividualDataModel =
  (mongoose.models.IndividualData as mongoose.Model<TIndividualData>) ??
  mongoose.model<TIndividualData>("IndividualData", individualDataSchema); 