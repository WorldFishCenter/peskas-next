import { FishDistributionModel } from "@repo/nosql/schema/fish-distribution";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";

export const fishDistributionRouter = createTRPCRouter({
  // Get monthly distribution by fish category
  monthly: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(async ({ input }) => {
      try {
        await getDb(); // Ensure DB connection is established
        return await FishDistributionModel.aggregate([
          {
            $match: {
              landing_site: { $in: input.bmus },
              total_catch_kg: { $ne: null },
            },
          },
          {
            $project: {
              _id: 0,
              date: 1,
              landing_site: 1,
              fish_category: 1,
              total_catch_kg: 1,
            },
          },
          {
            $sort: { date: 1, fish_category: 1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in fish distribution monthly query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch fish distribution data',
          cause: error,
        });
      }
    }),
  
  // Get summary of total catch by fish category for all time or a specific timeframe
  categorySummary: protectedProcedure
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
          landing_site: { $in: input.bmus },
          total_catch_kg: { $ne: null },
        };
        
        if (input.startDate || input.endDate) {
          matchStage.date = {};
          if (input.startDate) {
            matchStage.date.$gte = new Date(input.startDate);
          }
          if (input.endDate) {
            matchStage.date.$lte = new Date(input.endDate);
          }
        }
        
        return await FishDistributionModel.aggregate([
          {
            $match: matchStage,
          },
          {
            $group: {
              _id: "$fish_category",
              total_catch: { $sum: "$total_catch_kg" },
              bmus: { $addToSet: "$landing_site" },
            },
          },
          {
            $project: {
              _id: 0,
              fish_category: "$_id",
              total_catch: 1,
              bmu_count: { $size: "$bmus" },
            },
          },
          {
            $sort: { total_catch: -1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in fish category summary query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch fish category summary data',
          cause: error,
        });
      }
    }),
  
  // Get monthly trends by fish category
  monthlyTrends: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      categories: z.string().array().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        // Prepare match stage with optional category filtering
        const matchStage: any = {
          landing_site: { $in: input.bmus },
          total_catch_kg: { $ne: null },
        };
        
        if (input.categories && input.categories.length > 0) {
          matchStage.fish_category = { $in: input.categories };
        }
        
        return await FishDistributionModel.aggregate([
          {
            $match: matchStage,
          },
          {
            $group: {
              _id: {
                month: { $dateToString: { format: "%Y-%m", date: "$date" } },
                category: "$fish_category",
                landing_site: "$landing_site"
              },
              total_catch: { $sum: "$total_catch_kg" },
            },
          },
          {
            $group: {
              _id: {
                month: "$_id.month",
                landing_site: "$_id.landing_site"
              },
              categories: {
                $push: {
                  category: "$_id.category",
                  total_catch: "$total_catch",
                },
              },
              totalForMonth: { $sum: "$total_catch" },
            },
          },
          {
            $project: {
              _id: 0,
              month: "$_id.month",
              landing_site: "$_id.landing_site",
              date: { $dateFromString: { dateString: { $concat: ["$_id.month", "-01"] } } },
              categories: 1,
              totalForMonth: 1,
            },
          },
          {
            $sort: { date: 1, landing_site: 1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in monthly trends query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch monthly trends data',
          cause: error,
        });
      }
    }),
}); 