import { IndividualStatsModel } from "@repo/nosql/schema/individual-data";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { IndividualFishDistributionModel } from "@repo/nosql/schema/individual-fish-distribution";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";
import { getAllBmuVariants } from "../utils/bmu-normalizer";

export const individualDataRouter = createTRPCRouter({
  // Get all individual data for specified BMUs
  all: protectedProcedure
    .input(z.object({ bmus: z.string().array() }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        const allBmus = getAllBmuVariants(input.bmus);
        
        const matchStage = {
          BMU: { $in: allBmus },
        };
        
        return await IndividualStatsModel.find(matchStage)
          .select({
            _id: 0,
            date: 1,
            BMU: 1,
            fisher_id: 1,
            mean_cpue: 1,
            mean_rpue: 1,
            mean_price_kg: 1,
            mean_cost: 1,
            mean_profit: 1,
          })
          .sort({ date: -1 })
          .exec();
      } catch (error) {
        console.error('Error in individual data all query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch individual data',
          cause: error,
        });
      }
    }),

  // Get individual data by fisher_id (for IIA users)
  byFisherId: protectedProcedure
    .input(z.object({ 
      fisherId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        const matchStage: any = {
          fisher_id: input.fisherId,
        };
        
        if (input.startDate || input.endDate) {
          matchStage.date = {};
          if (input.startDate) {
            matchStage.date.$gte = new Date(input.startDate);
          }
          if (input.endDate) {
            matchStage.date.$lte = new Date(input.endDate);
          }
        }
        
        return await IndividualStatsModel.find(matchStage)
          .select({
            _id: 0,
            date: 1,
            BMU: 1,
            fisher_id: 1,
            mean_cpue: 1,
            mean_rpue: 1,
            mean_price_kg: 1,
            mean_cost: 1,
            mean_profit: 1,
          })
          .sort({ date: -1 })
          .exec();
      } catch (error) {
        console.error('Error in individual fisher data query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch individual fisher data',
          cause: error,
        });
      }
    }),

  // Get yearly aggregated data by fisher_id (optimized for annual charts)
  yearlyByFisherId: protectedProcedure
    .input(z.object({ 
      fisherId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        // Prepare match stage with optional date filtering
        const matchStage: any = {
          fisher_id: input.fisherId,
        };
        
        if (input.startDate || input.endDate) {
          matchStage.date = {};
          if (input.startDate) {
            matchStage.date.$gte = new Date(input.startDate);
          }
          if (input.endDate) {
            matchStage.date.$lte = new Date(input.endDate);
          }
        }
        
        // Aggregate by year
        return await IndividualStatsModel.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: { $year: "$date" },
              mean_cpue: { $avg: "$mean_cpue" },
              mean_rpue: { $avg: "$mean_rpue" },
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              year: "$_id",
              mean_cpue: { $round: ["$mean_cpue", 2] },
              mean_rpue: { $round: ["$mean_rpue", 2] },
              count: 1,
              _id: 0
            }
          },
          { $sort: { year: 1 } }
        ]);
      } catch (error) {
        console.error('Error in individual data yearlyByFisherId query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch yearly individual fisher data',
          cause: error,
        });
      }
    }),

  // Get performance metrics by individual fishers
  performanceMetrics: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        const allBmus = getAllBmuVariants(input.bmus);
        
        return await IndividualStatsModel.aggregate([
          {
            $match: {
              BMU: { $in: allBmus },
              mean_cpue: { $ne: null },
              mean_rpue: { $ne: null },
            },
          },
          {
            $group: {
              _id: {
                fisher_id: "$fisher_id",
                BMU: "$BMU",
              },
              avg_cpue: { $avg: "$mean_cpue" },
              avg_rpue: { $avg: "$mean_rpue" },
              avg_cost: { $avg: "$mean_cost" },
              avg_price_kg: { $avg: "$mean_price_kg" },
              avg_profit: { $avg: "$mean_profit" },
              total_trips: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              fisher_id: "$_id.fisher_id",
              BMU: "$_id.BMU",
              avg_cpue: { $round: ["$avg_cpue", 2] },
              avg_rpue: { $round: ["$avg_rpue", 2] },
              avg_cost: { $round: ["$avg_cost", 2] },
              avg_price_kg: { $round: ["$avg_price_kg", 2] },
              avg_profit: { $round: ["$avg_profit", 2] },
              total_trips: 1,
            },
          },
          {
            $sort: { avg_cpue: -1 },
          },
          {
            $limit: input.limit,
          },
        ]).exec();
      } catch (error) {
        console.error('Error in performance metrics query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch performance metrics',
          cause: error,
        });
      }
    }),

  // Get monthly trends for individual data
  monthlyTrends: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      metric: z.enum(['mean_cpue', 'mean_rpue', 'mean_cost', 'mean_profit', 'mean_price_kg']).optional().default('mean_cpue'),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        const allBmus = getAllBmuVariants(input.bmus);
        
        return await IndividualStatsModel.aggregate([
          {
            $match: {
              BMU: { $in: allBmus },
              [input.metric]: { $ne: null },
            },
          },
          {
            $group: {
              _id: {
                month: { $dateToString: { format: "%Y-%m", date: "$date" } },
                BMU: "$BMU",
              },
              avg_value: { $avg: `$${input.metric}` },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              month: "$_id.month",
              BMU: "$_id.BMU",
              date: { $dateFromString: { dateString: { $concat: ["$_id.month", "-01"] } } },
              avg_value: { $round: ["$avg_value", 2] },
              count: 1,
            },
          },
          {
            $sort: { date: 1, BMU: 1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in monthly trends query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch monthly trends',
          cause: error,
        });
      }
    }),

  // Get monthly trends for a specific fisher (for IIA users)
  fisherMonthlyTrends: protectedProcedure
    .input(z.object({ 
      fisherId: z.string(),
      metric: z.enum(['mean_cpue', 'mean_rpue', 'mean_cost', 'mean_profit', 'mean_price_kg']).optional().default('mean_cpue'),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        return await IndividualStatsModel.aggregate([
          {
            $match: {
              fisher_id: input.fisherId,
              [input.metric]: { $ne: null },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
              avg_value: { $avg: `$${input.metric}` },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              month: "$_id",
              date: { $dateFromString: { dateString: { $concat: ["$_id", "-01"] } } },
              avg_value: { $round: ["$avg_value", 2] },
              count: 1,
            },
          },
          {
            $sort: { date: 1 },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in fisher monthly trends query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch fisher monthly trends',
          cause: error,
        });
      }
    }),

  // Get performance summary for a specific fisher (for IIA users)
  fisherPerformanceSummary: protectedProcedure
    .input(z.object({ 
      fisherId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        // Prepare match stage with optional date filtering
        const matchStage: any = {
          fisher_id: input.fisherId,
        };
        
        if (input.startDate || input.endDate) {
          matchStage.date = {};
          if (input.startDate) {
            matchStage.date.$gte = new Date(input.startDate);
          }
          if (input.endDate) {
            matchStage.date.$lte = new Date(input.endDate);
          }
        }
        
        return await IndividualStatsModel.aggregate([
          {
            $match: matchStage,
          },
          {
            $group: {
              _id: null,
              total_trips: { $sum: 1 },
              avg_cpue: { $avg: "$mean_cpue" },
              avg_rpue: { $avg: "$mean_rpue" },
              avg_cost: { $avg: "$mean_cost" },
              avg_price_kg: { $avg: "$mean_price_kg" },
              avg_profit: { $avg: "$mean_profit" },
              total_costs: { $sum: "$mean_cost" },
              total_revenue: { $sum: "$mean_rpue" },
              latest_trip: { $max: "$date" },
              earliest_trip: { $min: "$date" },
            },
          },
          {
            $project: {
              _id: 0,
              total_trips: 1,
              avg_cpue: { $round: ["$avg_cpue", 2] },
              avg_rpue: { $round: ["$avg_rpue", 2] },
              avg_cost: { $round: ["$avg_cost", 2] },
              avg_price_kg: { $round: ["$avg_price_kg", 2] },
              avg_profit: { $round: ["$avg_profit", 2] },
              total_costs: { $round: ["$total_costs", 2] },
              total_revenue: { $round: ["$total_revenue", 2] },
              net_profit: { $round: [{ $subtract: ["$total_revenue", "$total_costs"] }, 2] },
              latest_trip: 1,
              earliest_trip: 1,
            },
          },
        ]).exec();
      } catch (error) {
        console.error('Error in fisher performance summary query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch fisher performance summary',
          cause: error,
        });
      }
    }),

  // Get individual fish distribution by fisher_id
  individualFishDistributionByFisher: protectedProcedure
    .input(z.object({ 
      fisherId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        const query: any = { fisher_id: input.fisherId };
        if (input.startDate || input.endDate) {
          query.date = {};
          if (input.startDate) query.date.$gte = new Date(input.startDate);
          if (input.endDate) query.date.$lte = new Date(input.endDate);
        }
        
        return await IndividualFishDistributionModel.find(query).sort({ date: 1 }).exec();
      } catch (error) {
        console.error('Error in individual fish distribution by fisher query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch individual fish distribution by fisher',
          cause: error,
        });
      }
    }),

  // Get individual fish distribution by BMU
  individualFishDistributionByBMU: protectedProcedure
    .input(z.object({ 
      bmu: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb();
        
        const query: any = { landing_site: { $in: getAllBmuVariants([input.bmu]) } };
        if (input.startDate || input.endDate) {
          query.date = {};
          if (input.startDate) query.date.$gte = new Date(input.startDate);
          if (input.endDate) query.date.$lte = new Date(input.endDate);
        }

        return await IndividualFishDistributionModel.find(query).sort({ date: 1 }).exec();
      } catch (error) {
        console.error('Error in individual fish distribution by BMU query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch individual fish distribution by BMU',
          cause: error,
        });
      }
    }),
}); 