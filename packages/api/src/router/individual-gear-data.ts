import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { IndividualGearStatsModel } from "@repo/nosql/schema/individual-gear-data";
import getDb from "@repo/nosql";
import { generateBmuVariants } from "../utils/bmu-normalizer";

export const individualGearDataRouter = createTRPCRouter({
  // Get all gear stats for a specific fisher
  byFisher: protectedProcedure
    .input(z.object({ fisher_id: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ input }) => {
      await getDb();
      const query: any = { fisher_id: input.fisher_id };
      if (input.startDate || input.endDate) {
        query.date = {};
        if (input.startDate) query.date.$gte = new Date(input.startDate);
        if (input.endDate) query.date.$lte = new Date(input.endDate);
      }
      return IndividualGearStatsModel.find(query);
    }),

  // Get all gear stats for a specific BMU
  byBMU: protectedProcedure
    .input(z.object({ BMU: z.string() }))
    .query(async ({ input }) => {
      await getDb();
      // Generate all possible BMU name variants to handle naming inconsistencies
      const bmuVariants = generateBmuVariants(input.BMU);
      return IndividualGearStatsModel.find({ BMU: { $in: bmuVariants } });
    }),

  // Get all gear stats for a BMU excluding a specific fisher (for BMU average)
  bmuAverage: protectedProcedure
    .input(z.object({ BMU: z.string(), excludeFisherId: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ input }) => {
      await getDb();
      // Generate all possible BMU name variants to handle naming inconsistencies
      const bmuVariants = generateBmuVariants(input.BMU);
      const query: any = { BMU: { $in: bmuVariants }, fisher_id: { $ne: input.excludeFisherId } };
      if (input.startDate || input.endDate) {
        query.date = {};
        if (input.startDate) query.date.$gte = new Date(input.startDate);
        if (input.endDate) query.date.$lte = new Date(input.endDate);
      }
      return IndividualGearStatsModel.find(query);
    }),
}); 