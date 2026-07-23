import { FishDistributionModel } from "@repo/nosql/schema/fish-distribution";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";
import { getAllBmuVariants } from "../utils/bmu-normalizer";

export const fishDistributionRouter = createTRPCRouter({
  // Get monthly trends by fish category
  monthlyTrends: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      categories: z.string().array().optional(),
      useTotal: z.boolean().optional().default(false), // true for total_catch_kg, false for mean_catch_kg
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        const allBmus = getAllBmuVariants(input.bmus);

        // Prepare match stage with optional category filtering
        const fieldToUse = input.useTotal ? 'total_catch_kg' : 'mean_catch_kg';
        const matchStage: any = {
          landing_site: { $in: allBmus },
          [fieldToUse]: { $ne: null },
        };
        
        if (input.categories && input.categories.length > 0) {
          matchStage.fish_category = { $in: input.categories };
        }
        
        const result = await FishDistributionModel.aggregate([
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
              total_catch: { $sum: `$${fieldToUse}` },
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
        
        return result;
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