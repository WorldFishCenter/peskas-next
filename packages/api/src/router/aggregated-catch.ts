import { CatchMonthlyModel } from "@repo/nosql/schema/catch-monthly";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const metricSchema = z.enum([
  "mean_trip_catch",
  "mean_effort",
  "mean_cpue",
  "mean_cpua",
]);

export const aggregatedCatchRouter = createTRPCRouter({
  // Keep original monthly endpoint for time series plot
  monthly: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(({ input }) => {
      return CatchMonthlyModel.aggregate([
        {
          $match: {
            BMU: { $in: input.bmus },
            mean_trip_catch: { $ne: null },
          },
        },
        {
          $project: {
            _id: 0,
            date: 1,
            landing_site: "$BMU",
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

  // New endpoint for performance table
  performance: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(({ input }) => {
      return CatchMonthlyModel.aggregate([
        {
          $match: {
            BMU: { $in: input.bmus },
            mean_trip_catch: { $ne: null },
          },
        },
        {
          $addFields: {
            month: { $month: "$date" },
            year: { $year: "$date" }
          }
        },
        {
          $group: {
            _id: "$BMU",
            avgCatch: { $avg: "$mean_trip_catch" },
            avgEffort: { $avg: "$mean_effort" },
            avgCPUE: { $avg: "$mean_cpue" },
            avgCPUA: { $avg: "$mean_cpua" },
            totalCatch: { $sum: "$mean_trip_catch" },
            totalEffort: { $sum: "$mean_effort" },
            monthlyData: {
              $push: {
                date: "$date",
                mean_trip_catch: "$mean_trip_catch",
                mean_effort: "$mean_effort",
                mean_cpue: "$mean_cpue",
                mean_cpua: "$mean_cpua"
              }
            }
          }
        },
        {
          $facet: {
            stats: [
              { $sort: { avgCatch: -1 } },
              {
                $group: {
                  _id: null,
                  maxCatch: { $first: "$avgCatch" },
                  maxEffort: { $max: "$avgEffort" },
                  maxCPUE: { $max: "$avgCPUE" },
                  maxCPUA: { $max: "$avgCPUA" },
                  bmus: { $push: "$$ROOT" }
                }
              },
              {
                $unwind: "$bmus"
              },
              {
                $project: {
                  bmu: "$bmus._id",
                  avgCatch: "$bmus.avgCatch",
                  avgEffort: "$bmus.avgEffort",
                  avgCPUE: "$bmus.avgCPUE",
                  avgCPUA: "$bmus.avgCPUA",
                  totalCatch: "$bmus.totalCatch",
                  monthlyData: "$bmus.monthlyData",
                  catchPerformance: { 
                    $multiply: [{ $divide: ["$bmus.avgCatch", "$maxCatch"] }, 100] 
                  },
                  effortPerformance: { 
                    $multiply: [{ $divide: ["$bmus.avgEffort", "$maxEffort"] }, 100] 
                  },
                  cpuePerformance: { 
                    $multiply: [{ $divide: ["$bmus.avgCPUE", "$maxCPUE"] }, 100] 
                  },
                  cpuaPerformance: { 
                    $multiply: [{ $divide: ["$bmus.avgCPUA", "$maxCPUA"] }, 100] 
                  }
                }
              },
              {
                $sort: { catchPerformance: -1 }
              }
            ]
          }
        },
        {
          $unwind: "$stats"
        },
        {
          $replaceRoot: { newRoot: "$stats" }
        }
      ]).exec();
    }),

  // Keep original meanCatchRadar endpoint
  meanCatchRadar: protectedProcedure
    .input(
      z.object({
        bmus: z.string().array(),
        metric: metricSchema.default("mean_trip_catch"),
      })
    )
    .query(({ input }) => {
      return CatchMonthlyModel.aggregate([
        {
          $match: {
            BMU: { $in: input.bmus },
            [input.metric]: { $ne: null },
          },
        },
        {
          $addFields: {
            monthNum: { $month: "$date" },
          },
        },
        {
          $group: {
            _id: {
              month: "$monthNum",
              bmu: "$BMU",
            },
            value: { $avg: `$${input.metric}` },
          },
        },
        {
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
            sortOrder: "$_id.month",
          },
        },
        {
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
          $project: {
            _id: 0,
            month: "$_id",
            values: {
              $arrayToObject: "$values",
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$values", { month: "$month" }],
            },
          },
        },
        {
          $sort: {
            month: 1,
          },
        },
      ]).exec();
    }),
});