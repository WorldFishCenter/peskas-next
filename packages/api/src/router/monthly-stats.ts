import { z } from "zod";
import isEmpty from 'lodash/isEmpty';
import getDb from "@repo/nosql";
import { MonthlyStatsModel } from "@repo/nosql/schema/monthly-stats";
import { createTRPCRouter, protectedProcedure } from "../trpc";

function calculatePercentageChange(current: number, previous: number | undefined): number {
  if (!previous) return 0;
  return Number(((current - previous) / previous * 100).toFixed(2));
}

export const monthlyStatsRouter = createTRPCRouter({
  allStats: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(async ({ input }) => {
      await getDb();
      
      if (isEmpty(input.bmus)) return null;

      // Use aggregation to group and sum by month
      const data = await MonthlyStatsModel.aggregate([
        {
          $match: {
            landing_site: {
              $in: input.bmus.map(bmu => new RegExp(`^${bmu}$`, 'i'))
            }
          }
        },
        {
          // Group by month to sum all values
          $group: {
            _id: "$date",
            tot_submissions: { $sum: "$tot_submissions" },
            tot_fishers: { $sum: "$tot_fishers" },
            tot_catches: { $sum: "$tot_catches" },
            tot_kg: { $sum: "$tot_kg" },
            date: { $first: "$date" }
          }
        },
        {
          $sort: { date: -1 }
        },
        {
          $limit: 7
        }
      ]);

      console.log('Aggregated data:', data);

      if (isEmpty(data)) return null;

      return {
        submissions: {
          current: data[0].tot_submissions,
          percentage: calculatePercentageChange(data[0].tot_submissions, data[1]?.tot_submissions),
          trend: data.slice(0, 6).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.tot_submissions
          })).reverse()
        },
        fishers: {
          current: data[0].tot_fishers,
          percentage: calculatePercentageChange(data[0].tot_fishers, data[1]?.tot_fishers),
          trend: data.slice(0, 6).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.tot_fishers
          })).reverse()
        },
        catches: {
          current: data[0].tot_catches,
          percentage: calculatePercentageChange(data[0].tot_catches, data[1]?.tot_catches),
          trend: data.slice(0, 6).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.tot_catches
          })).reverse()
        },
        weight: {
          current: data[0].tot_kg,
          percentage: calculatePercentageChange(data[0].tot_kg, data[1]?.tot_kg),
          trend: data.slice(0, 6).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.tot_kg
          })).reverse()
        }
      };
    }),
});