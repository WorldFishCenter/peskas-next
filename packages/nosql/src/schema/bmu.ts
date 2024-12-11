import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

export const TREATMENTS = [
  "individual",
  "community",
  "experts",
  "neighborhood",
] as const;

export type TTreatment = (typeof TREATMENTS)[number];

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type TBmu = {
  _id: Types.ObjectId;
  BMU: string;
  group: string;
  lat: number;
  lng: string;
  treatments: TTreatment[];
};

/**
 * Schema
 */
const bmuSchema = new Schema<TBmu>(
  {
    BMU: String,
    group: String,
    lat: Number,
    lng: Number,
    treatments: [{ type: String, enum: TREATMENTS }],
  },
  {
    collection: "bmu",
  },
);

/**
 * Model
 */
export const BmuModel =
  (mongoose.models.Bmu as mongoose.Model<TBmu>) ??
  mongoose.model<TBmu>("Bmu", bmuSchema);
