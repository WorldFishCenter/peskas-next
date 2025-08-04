import { z } from "zod";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";

import { GearSummaryModel } from "@repo/nosql/schema/gear-summary";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const gearRouter = createTRPCRouter({
  summaries: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb(); // Ensure DB connection is established
        
        // Prepare match stage with optional date filtering
        const matchStage: any = {
          BMU: { $in: input.bmus },
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
        
        return await GearSummaryModel
          .find(matchStage)
          .select({
            _id: 0,
            BMU: 1,
            gear: 1,
            mean_trip_catch: 1,
            mean_effort: 1,
            mean_cpue: 1,
            mean_cpua: 1,
            mean_rpue: 1, 
            mean_rpua: 1,
            mean_cost: 1,
            mean_profit: 1,
            date: 1
          })
          .sort({ date: -1 })
          .exec();
      } catch (error) {
        console.error('Error in gear summaries query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch gear summaries',
          cause: error,
        });
      }
    }),
});