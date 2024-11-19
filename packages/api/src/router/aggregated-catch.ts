import { z } from "zod";
import { CatchMonthlyModel } from "@repo/nosql/schema/catch-monthly";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const metricSchema = z.enum(['mean_trip_catch', 'mean_effort', 'mean_cpue', 'mean_cpua']);

export const aggregatedCatchRouter = createTRPCRouter({
  monthly: protectedProcedure
    .query(() => {
      return CatchMonthlyModel.aggregate([
        {
          $match: {
            BMU: "Kenyatta",
            mean_trip_catch: { $ne: null }  // Added null check
          }
        },
        {
          $project: {
            _id: 0,
            date: 1,
            mean_trip_catch: 1,
            mean_effort: 1,
            mean_cpue: 1,
            mean_cpua: 1
          }
        },
        {
          $sort: { date: -1 }  // Changed to descending sort
        }
      ]).exec()
    }),
  meanCatchRadar: protectedProcedure
    .input(z.object({
      metric: metricSchema.default('mean_trip_catch')
    }))
    .query(({ input }) => {
      return CatchMonthlyModel.aggregate([
        {
          $match: {
            BMU: "Bureni",
            [input.metric]: { $ne: null }
          }
        },
        {
          $addFields: {
            monthNum: { $month: "$date" }
          }
        },
        {
          $group: {
            _id: "$monthNum",
            value: { $avg: `$${input.metric}` }
          }
        },
        {
          $project: {
            _id: 0,
            monthNum: "$_id",
            month: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id", 1] }, then: "Jan" },
                  { case: { $eq: ["$_id", 2] }, then: "Feb" },
                  { case: { $eq: ["$_id", 3] }, then: "Mar" },
                  { case: { $eq: ["$_id", 4] }, then: "Apr" },
                  { case: { $eq: ["$_id", 5] }, then: "May" },
                  { case: { $eq: ["$_id", 6] }, then: "Jun" },
                  { case: { $eq: ["$_id", 7] }, then: "Jul" },
                  { case: { $eq: ["$_id", 8] }, then: "Aug" },
                  { case: { $eq: ["$_id", 9] }, then: "Sep" },
                  { case: { $eq: ["$_id", 10] }, then: "Oct" },
                  { case: { $eq: ["$_id", 11] }, then: "Nov" },
                  { case: { $eq: ["$_id", 12] }, then: "Dec" }
                ],
                default: "Unknown"
              }
            },
            value: { $round: ["$value", 1] }
          }
        },
        {
          $sort: { monthNum: 1 }
        },
        {
          $project: {
            monthNum: 0
          }
        }
      ]).exec();
    }),  
});