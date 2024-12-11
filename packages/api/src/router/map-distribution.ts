import { z } from "zod";

import { MapDistributionModel } from "@repo/nosql/schema/map-distribution";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const mapDistributionRouter = createTRPCRouter({
  all: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(({ input }) => {
      return MapDistributionModel
        .find({ landing_site: { $in: input.bmus } })
        .select({
          _id: 0,
        })      
        .lean()
    }),
});