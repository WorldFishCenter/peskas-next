import { CatchMonthlyModel } from "@repo/nosql/schema/catch-monthly";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";

const metricSchema = z.enum([
  "mean_effort",
  "mean_cpue",
  "mean_cpua",
  "mean_rpue",
  "mean_rpua",
]);

export const aggregatedCatchRouter = createTRPCRouter({
  monthly: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(async ({ input }) => {
      try {
        await getDb(); // Ensure DB connection is established
        return await CatchMonthlyModel.aggregate([
          {
            $match: {
              BMU: { $in: input.bmus },
              $or: [
                { mean_effort: { $ne: null } },
                { mean_cpue: { $ne: null } },
                { mean_cpua: { $ne: null } },
                { mean_rpue: { $ne: null } },
                { mean_rpua: { $ne: null } },
              ],
            },
          },
          {
            $project: {
              _id: 0,
              date: 1,
              landing_site: "$BMU",
              mean_effort: 1,
              mean_cpue: 1,
              mean_cpua: 1,
              mean_rpue: 1,
              mean_rpua: 1,
            },
          },
          {
            $sort: { date: -1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in monthly query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch monthly data',
          cause: error,
        });
      }
    }),

  performance: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(async ({ input }) => {
      try {
        await getDb(); // Ensure DB connection is established
        return await CatchMonthlyModel.aggregate([
          {
            $match: {
              BMU: { $in: input.bmus },
              $or: [
                { mean_effort: { $ne: null } },
                { mean_cpue: { $ne: null } },
                { mean_cpua: { $ne: null } },
                { mean_rpue: { $ne: null } },
                { mean_rpua: { $ne: null } },
              ],
            },
          },
          {
            $addFields: {
              month: { $month: "$date" },
              year: { $year: "$date" },
            },
          },
          {
            $group: {
              _id: "$BMU",
              avgEffort: { $avg: "$mean_effort" },
              avgCPUE: { $avg: "$mean_cpue" },
              avgCPUA: { $avg: "$mean_cpua" },
              avgRPUE: { $avg: "$mean_rpue" },
              avgRPUA: { $avg: "$mean_rpua" },
              totalEffort: { $sum: "$mean_effort" },
              monthlyData: {
                $push: {
                  date: "$date",
                  mean_effort: "$mean_effort",
                  mean_cpue: "$mean_cpue",
                  mean_cpua: "$mean_cpua",
                  mean_rpue: "$mean_rpue",
                  mean_rpua: "$mean_rpua",
                },
              },
            },
          },
          {
            $facet: {
              stats: [
                { $sort: { avgEffort: -1 } },
                {
                  $group: {
                    _id: null,
                    maxEffort: { $max: "$avgEffort" },
                    maxCPUE: { $max: "$avgCPUE" },
                    maxCPUA: { $max: "$avgCPUA" },
                    maxRPUE: { $max: "$avgRPUE" },
                    maxRPUA: { $max: "$avgRPUA" },
                    bmus: { $push: "$$ROOT" },
                  },
                },
                {
                  $unwind: "$bmus",
                },
                {
                  $project: {
                    bmu: "$bmus._id",
                    avgEffort: "$bmus.avgEffort",
                    avgCPUE: "$bmus.avgCPUE",
                    avgCPUA: "$bmus.avgCPUA",
                    avgRPUE: "$bmus.avgRPUE",
                    avgRPUA: "$bmus.avgRPUA",
                    totalEffort: "$bmus.totalEffort",
                    monthlyData: "$bmus.monthlyData",
                    effortPerformance: {
                      $multiply: [
                        { $divide: ["$bmus.avgEffort", "$maxEffort"] },
                        100,
                      ],
                    },
                    cpuePerformance: {
                      $multiply: [
                        { $divide: ["$bmus.avgCPUE", "$maxCPUE"] },
                        100,
                      ],
                    },
                    cpuaPerformance: {
                      $multiply: [
                        { $divide: ["$bmus.avgCPUA", "$maxCPUA"] },
                        100,
                      ],
                    },
                    rpuePerformance: {
                      $multiply: [
                        { $divide: ["$bmus.avgRPUE", "$maxRPUE"] },
                        100,
                      ],
                    },
                    rpuaPerformance: {
                      $multiply: [
                        { $divide: ["$bmus.avgRPUA", "$maxRPUA"] },
                        100,
                      ],
                    },
                  },
                },
                {
                  $sort: { effortPerformance: -1 },
                },
              ],
            },
          },
          {
            $unwind: "$stats",
          },
          {
            $replaceRoot: { newRoot: "$stats" },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in performance query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch performance data',
          cause: error,
        });
      }
    }),

  meanCatchRadar: protectedProcedure
    .input(
      z.object({
        bmus: z.string().array(),
        metric: metricSchema.default("mean_effort"),
      })
    )
    .query(async ({ input }) => {
      try {
        await getDb(); // Ensure DB connection is established
        return await CatchMonthlyModel.aggregate([
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
              sortOrder: 1,
            },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in meanCatchRadar query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch radar chart data',
          cause: error,
        });
      }
    }),
});
