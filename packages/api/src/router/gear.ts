import { z } from "zod";

import { GearDistributionModel } from "@repo/nosql/schema/gear-distribution";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const gearRouter = createTRPCRouter({
  distribution: protectedProcedure
    .query(async ({ ctx }) => {
      const data = await GearDistributionModel.find({}).exec();

      // Transform data for the stacked bar chart
      return data.reduce((acc: any[], curr) => {
        const existingSite = acc.find(item => item.landing_site === curr.landing_site);
        
        if (existingSite) {
          existingSite[curr.gear] = curr.gear_perc;
        } else {
          acc.push({
            landing_site: curr.landing_site,
            [curr.gear]: curr.gear_perc
          });
        }
        
        return acc;
      }, []);
    }),
  tree: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(({ input }) => {
      return GearDistributionModel
        .find({ 
          landing_site: { $in: input.bmus },
          gear_n: { $gt: 0 }  // Only get gears with counts greater than 0
        })
        .select({
          _id: 0,
          gear: 1,
          gear_n: 1
        })
        .sort({ gear_n: -1 })
        .exec();
  }),
});