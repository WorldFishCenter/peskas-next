import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/* eslint-disable @typescript-eslint/consistent-type-definitions */

/**
 * Per-route usage aggregate embedded in an app-usage session document.
 */
export type TAppUsagePageStat = {
  path: string;
  views: number;
  activeMs: number;
  lastVisitedAt: Date;
};

/**
 * One document per app "session" (per browser tab / login), upserted over the
 * lifetime of that session via client heartbeats. Time spent is accumulated in
 * `activeMs` while the tab is visible; session end is inferred from `lastSeenAt`.
 */
export type TAppUsageSession = {
  _id: Types.ObjectId;
  /** Client-generated id, stable per browser tab (sessionStorage). */
  sessionId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  /** Highest-priority role name: admin | WBCIA | CIA | AIA | IIA | unknown. */
  role?: string;
  /** Raw group names from the session. */
  groups: string[];
  /** Assigned BMU (from userBmu.BMU), when present. */
  bmu?: string;
  /** Fisher id (IIA users / admin-fishers), when present. */
  fisherId?: string;
  /** UI language at last heartbeat (en | sw). */
  language?: string;
  userAgent?: string;
  startedAt: Date;
  lastSeenAt: Date;
  /** Accumulated active (tab-visible) time across the whole session, ms. */
  activeMs: number;
  /** Total page views (route navigations) across the session. */
  pageViews: number;
  /** Per-route breakdown. */
  pages: TAppUsagePageStat[];
  created_at: Date;
  updated_at: Date;
};

/**
 * Schema
 */
const appUsageSessionSchema = new Schema<TAppUsageSession>(
  {
    sessionId: { type: String, required: true },
    userId: { type: String },
    userEmail: { type: String },
    userName: { type: String },
    role: { type: String },
    groups: [{ type: String }],
    bmu: { type: String },
    fisherId: { type: String },
    language: { type: String },
    userAgent: { type: String },
    startedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    activeMs: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    pages: [
      {
        _id: false,
        path: { type: String, required: true },
        views: { type: Number, default: 0 },
        activeMs: { type: Number, default: 0 },
        lastVisitedAt: { type: Date },
      },
    ],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: "app_usage_sessions",
  }
);

// One document per client session; upserts match on this.
appUsageSessionSchema.index({ sessionId: 1 }, { unique: true });
// Per-user history and time-range reporting.
appUsageSessionSchema.index({ userId: 1, startedAt: -1 });
appUsageSessionSchema.index({ startedAt: -1 });

/**
 * Model
 */
export const AppUsageSessionModel =
  (mongoose.models.AppUsageSession as mongoose.Model<TAppUsageSession>) ??
  mongoose.model<TAppUsageSession>("AppUsageSession", appUsageSessionSchema);
