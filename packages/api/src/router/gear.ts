import { z } from "zod";

import { GearSummaryModel } from "@repo/nosql/schema/gear-summary";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const gearRouter = createTRPCRouter({
  summaries: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(({ input }) => {
      return GearSummaryModel
        .find({ 
          BMU: { $in: input.bmus }
        })
        .select({
          _id: 0,
          BMU: 1,
          gear: 1,
          mean_trip_catch: 1,
          mean_effort: 1,
          mean_cpue: 1,
          mean_cpua: 1
        })
        .exec();
    }),
});