import { z } from "zod";

import { MapDistributionModel } from "@repo/nosql/schema/map-distribution";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { normalizeBmusForQuery } from "../utils/bmu-normalizer";

export const mapDistributionRouter = createTRPCRouter({
  all: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(({ input }) => {
      // Normalize BMU names to handle both hyphen and underscore formats
      const normalizedBmus = normalizeBmusForQuery(input.bmus);
      const allBmus = Array.from(new Set([...input.bmus, ...normalizedBmus]));

      return MapDistributionModel
        .find({ landing_site: { $in: allBmus } })
        .select({
          _id: 0,
        })
        .lean()
    }),
});