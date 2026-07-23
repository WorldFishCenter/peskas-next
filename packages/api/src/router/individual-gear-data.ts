import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { IndividualGearStatsModel } from "@repo/nosql/schema/individual-gear-data";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";
import { getAllBmuVariants } from "../utils/bmu-normalizer";

export const individualGearDataRouter = createTRPCRouter({
  // Get all gear stats for a specific fisher
  byFisher: protectedProcedure
    .input(z.object({ fisher_id: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        await getDb();
        const query: any = { fisher_id: input.fisher_id };
        if (input.startDate || input.endDate) {
          query.date = {};
          if (input.startDate) query.date.$gte = new Date(input.startDate);
          if (input.endDate) query.date.$lte = new Date(input.endDate);
        }
        return await IndividualGearStatsModel.find(query);
      } catch (error) {
        console.error('Error in individual gear data byFisher query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch individual gear data',
          cause: error,
        });
      }
    }),

  // Get all gear stats for a BMU excluding a specific fisher (for BMU average)
  bmuAverage: protectedProcedure
    .input(z.object({ BMU: z.string(), excludeFisherId: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        await getDb();
        const bmuVariants = getAllBmuVariants([input.BMU]);
        const query: any = { BMU: { $in: bmuVariants }, fisher_id: { $ne: input.excludeFisherId } };
        if (input.startDate || input.endDate) {
          query.date = {};
          if (input.startDate) query.date.$gte = new Date(input.startDate);
          if (input.endDate) query.date.$lte = new Date(input.endDate);
        }
        return await IndividualGearStatsModel.find(query);
      } catch (error) {
        console.error('Error in individual gear data bmuAverage query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch BMU average gear data',
          cause: error,
        });
      }
    }),
});