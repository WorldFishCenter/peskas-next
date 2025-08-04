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

      

      const data = await MonthlyStatsModel.aggregate([
        {
          $match: {
            BMU: {
              $in: input.bmus
            }
          }
        },
        {
          $group: {
            _id: "$date",
            mean_effort: { $avg: "$mean_effort" },
            mean_cpue: { $avg: "$mean_cpue" },
            mean_cpua: { $avg: "$mean_cpua" },
            mean_rpue: { $avg: "$mean_rpue" },
            mean_rpua: { $avg: "$mean_rpua" },
            mean_cost: { $avg: "$mean_cost" },
            mean_profit: { $avg: "$mean_profit" },
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

      if (isEmpty(data)) {
        
        return null;
      }

      return {
        effort: {
          current: data[0].mean_effort,
          percentage: calculatePercentageChange(data[0].mean_effort, data[1]?.mean_effort),
          trend: data.slice(0, 3).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.mean_effort
          })).reverse()
        },
        cpue: {
          current: data[0].mean_cpue,
          percentage: calculatePercentageChange(data[0].mean_cpue, data[1]?.mean_cpue),
          trend: data.slice(0, 3).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.mean_cpue
          })).reverse()
        },
        cpua: {
          current: data[0].mean_cpua,
          percentage: calculatePercentageChange(data[0].mean_cpua, data[1]?.mean_cpua),
          trend: data.slice(0, 3).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.mean_cpua
          })).reverse()
        },
        rpue: {
          current: data[0].mean_rpue,
          percentage: calculatePercentageChange(data[0].mean_rpue, data[1]?.mean_rpue),
          trend: data.slice(0, 3).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.mean_rpue
          })).reverse()
        },
        rpua: {
          current: data[0].mean_rpua,
          percentage: calculatePercentageChange(data[0].mean_rpua, data[1]?.mean_rpua),
          trend: data.slice(0, 3).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.mean_rpua
          })).reverse()
        },
        cost: {
          current: data[0].mean_cost,
          percentage: calculatePercentageChange(data[0].mean_cost, data[1]?.mean_cost),
          trend: data.slice(0, 3).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.mean_cost
          })).reverse()
        },
        profit: {
          current: data[0].mean_profit,
          percentage: calculatePercentageChange(data[0].mean_profit, data[1]?.mean_profit),
          trend: data.slice(0, 3).map(d => ({
            day: new Date(d.date).toLocaleString('default', { month: 'short' }),
            sale: d.mean_profit
          })).reverse()
        }
      };
    }),
});