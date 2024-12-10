import { z } from "zod";
import { CatchMonthlyModel } from "@repo/nosql/schema/catch-monthly";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const metricSchema = z.enum([
  "mean_trip_catch",
  "mean_effort",
  "mean_cpue",
  "mean_cpua",
]);

export const aggregatedCatchRouter = createTRPCRouter({
  monthly: protectedProcedure.query(() => {
    return CatchMonthlyModel.aggregate([
      {
        $match: {
          BMU: { $in: ["Kenyatta", "Bureni", "Marina"] },
          mean_trip_catch: { $ne: null },
        },
      },
      {
        $project: {
          _id: 0,
          date: 1,
          landing_site: "$BMU", // Rename BMU to landing_site for frontend compatibility
          mean_trip_catch: 1,
          mean_effort: 1,
          mean_cpue: 1,
          mean_cpua: 1,
        },
      },
      {
        $sort: { date: -1 },
      },
    ]).exec();
  }),

  meanCatchRadar: protectedProcedure
    .input(
      z.object({
        metric: metricSchema.default("mean_trip_catch"),
      })
    )
    .query(({ input }) => {
      return CatchMonthlyModel.aggregate([
        {
          $match: {
            BMU: { $in: ["Kenyatta", "Bureni", "Marina"] },
            [input.metric]: { $ne: null },
          },
        },
        {
          $addFields: {
            monthNum: { $month: "$date" },
          },
        },
        {
          // First group by both month and BMU
          $group: {
            _id: {
              month: "$monthNum",
              bmu: "$BMU",
            },
            value: { $avg: `$${input.metric}` },
          },
        },
        {
          // Add month name
          $addFields: {
            monthName: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                  { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                  { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                  { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                  { case: { $eq: ["$_id.month", 5] }, then: "May" },
                  { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                  { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                  { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                  { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                  { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                  { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                  { case: { $eq: ["$_id.month", 12] }, then: "Dec" },
                ],
                default: "Unknown",
              },
            },
          },
        },
        {
          // Reshape data
          $group: {
            _id: "$monthName",
            values: {
              $push: {
                k: "$_id.bmu",
                v: { $round: ["$value", 1] },
              },
            },
          },
        },
        {
          // Convert array to object
          $project: {
            _id: 0,
            month: "$_id",
            Kenyatta: {
              $reduce: {
                input: "$values",
                initialValue: null,
                in: {
                  $cond: [
                    { $eq: ["$$this.k", "Kenyatta"] },
                    "$$this.v",
                    "$$value",
                  ],
                },
              },
            },
            Bureni: {
              $reduce: {
                input: "$values",
                initialValue: null,
                in: {
                  $cond: [
                    { $eq: ["$$this.k", "Bureni"] },
                    "$$this.v",
                    "$$value",
                  ],
                },
              },
            },
            Marina: {
              $reduce: {
                input: "$values",
                initialValue: null,
                in: {
                  $cond: [
                    { $eq: ["$$this.k", "Marina"] },
                    "$$this.v",
                    "$$value",
                  ],
                },
              },
            },
          },
        },
        {
          // Sort by month number for proper order
          $sort: {
            month: 1,
          },
        },
      ]).exec();
    }),
});
