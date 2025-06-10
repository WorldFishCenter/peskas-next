import { IndividualDataModel } from "@repo/nosql/schema/individual-data";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";

export const individualDataRouter = createTRPCRouter({
  // Get all individual data for specified BMUs
  all: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(async ({ input }) => {
      try {
        await getDb(); // Ensure DB connection is established
        return await IndividualDataModel.find({
          BMU: { $in: input.bmus },
        })
        .select({
          _id: 0,
          landing_date: 1,
          BMU: 1,
          gear: 1,
          fisher_id: 1,
          fisher_cpue: 1,
          fisher_rpue: 1,
          fisher_cost: 1,
        })
        .sort({ landing_date: -1 })
        .exec();
      } catch (error) {
        console.error('Error in individual data all query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch individual data',
          cause: error,
        });
      }
    }),

  // Get aggregated individual data by gear type
  gearSummary: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        // Prepare match stage with optional date filtering
        const matchStage: any = {
          BMU: { $in: input.bmus },
        };
        
        if (input.startDate || input.endDate) {
          matchStage.landing_date = {};
          if (input.startDate) {
            matchStage.landing_date.$gte = new Date(input.startDate);
          }
          if (input.endDate) {
            matchStage.landing_date.$lte = new Date(input.endDate);
          }
        }
        
        return await IndividualDataModel.aggregate([
          {
            $match: matchStage,
          },
          {
            $group: {
              _id: {
                BMU: "$BMU",
                gear: "$gear",
              },
              avg_cpue: { $avg: "$fisher_cpue" },
              avg_rpue: { $avg: "$fisher_rpue" },
              avg_cost: { $avg: "$fisher_cost" },
              total_fishers: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              BMU: "$_id.BMU",
              gear: "$_id.gear",
              avg_cpue: { $round: ["$avg_cpue", 2] },
              avg_rpue: { $round: ["$avg_rpue", 2] },
              avg_cost: { $round: ["$avg_cost", 2] },
              total_fishers: 1,
            },
          },
          {
            $sort: { BMU: 1, gear: 1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in gear summary query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch gear summary',
          cause: error,
        });
      }
    }),

  // Get performance metrics by individual fishers
  performanceMetrics: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        return await IndividualDataModel.aggregate([
          {
            $match: {
              BMU: { $in: input.bmus },
              fisher_cpue: { $ne: null },
              fisher_rpue: { $ne: null },
            },
          },
          {
            $group: {
              _id: {
                fisher_id: "$fisher_id",
                BMU: "$BMU",
              },
              avg_cpue: { $avg: "$fisher_cpue" },
              avg_rpue: { $avg: "$fisher_rpue" },
              avg_cost: { $avg: "$fisher_cost" },
              total_trips: { $sum: 1 },
              primary_gear: { $first: "$gear" },
            },
          },
          {
            $project: {
              _id: 0,
              fisher_id: "$_id.fisher_id",
              BMU: "$_id.BMU",
              avg_cpue: { $round: ["$avg_cpue", 2] },
              avg_rpue: { $round: ["$avg_rpue", 2] },
              avg_cost: { $round: ["$avg_cost", 2] },
              total_trips: 1,
              primary_gear: 1,
            },
          },
          {
            $sort: { avg_cpue: -1 },
          },
          {
            $limit: input.limit,
          },
        ]).exec();
      } catch (error) {
        console.error('Error in performance metrics query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch performance metrics',
          cause: error,
        });
      }
    }),

  // Get monthly trends for individual data
  monthlyTrends: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      metric: z.enum(['fisher_cpue', 'fisher_rpue', 'fisher_cost']).optional().default('fisher_cpue'),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        return await IndividualDataModel.aggregate([
          {
            $match: {
              BMU: { $in: input.bmus },
              [input.metric]: { $ne: null },
            },
          },
          {
            $group: {
              _id: {
                month: { $dateToString: { format: "%Y-%m", date: "$landing_date" } },
                BMU: "$BMU",
              },
              avg_value: { $avg: `$${input.metric}` },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              month: "$_id.month",
              BMU: "$_id.BMU",
              date: { $dateFromString: { dateString: { $concat: ["$_id.month", "-01"] } } },
              avg_value: { $round: ["$avg_value", 2] },
              count: 1,
            },
          },
          {
            $sort: { date: 1, BMU: 1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in monthly trends query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch monthly trends',
          cause: error,
        });
      }
    }),
}); 