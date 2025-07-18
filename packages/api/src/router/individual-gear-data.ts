import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { IndividualGearStatsModel } from "@repo/nosql/schema/individual-gear-data";
import getDb from "@repo/nosql";

export const individualGearDataRouter = createTRPCRouter({
  // Get all gear stats for a specific fisher
  byFisher: protectedProcedure
    .input(z.object({ fisher_id: z.string() }))
    .query(async ({ input }) => {
      await getDb();
      return IndividualGearStatsModel.find({ fisher_id: input.fisher_id });
    }),

  // Get all gear stats for a specific BMU
  byBMU: protectedProcedure
    .input(z.object({ BMU: z.string() }))
    .query(async ({ input }) => {
      await getDb();
      return IndividualGearStatsModel.find({ BMU: input.BMU });
    }),

  // Get all gear stats for a BMU excluding a specific fisher (for BMU average)
  bmuAverage: protectedProcedure
    .input(z.object({ BMU: z.string(), excludeFisherId: z.string() }))
    .query(async ({ input }) => {
      await getDb();
      return IndividualGearStatsModel.find({ BMU: input.BMU, fisher_id: { $ne: input.excludeFisherId } });
    }),
}); 