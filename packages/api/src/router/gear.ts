import { z } from "zod";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";

import { GearSummaryModel } from "@repo/nosql/schema/gear-summary";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { normalizeBmusForQuery } from "../utils/bmu-normalizer";

/**
 * Get all BMU variants including special handling for Kiwayuu BMUs
 * This ensures that when querying for any Kiwayuu BMU, we also include
 * related variants (Inde, Nje, Ndani) to handle cases where BMUs exist
 * in catch data but not in the BMU collection.
 */
const getAllBmuVariants = (bmus: string[]): string[] => {
  // Normalize BMU names to handle both hyphen and underscore formats
  const normalizedBmus = normalizeBmusForQuery(bmus);
  
  // Special handling: if querying for Kiwayuu BMUs, also include related variants
  // This handles cases where "Kiwayuu cha Inde" exists in catch data but not in BMU collection
  const additionalBmus: string[] = [];
  bmus.forEach(bmu => {
    const normalized = bmu.toLowerCase().replace(/[-_\s]/g, '');
    // If querying for any Kiwayuu BMU, also include common Kiwayuu variants
    if (normalized.includes('kiwayuu')) {
      // Add "Kiwayuu cha Inde" variants if not already included
      if (!normalized.includes('inde')) {
        additionalBmus.push('Kiwayuu cha Inde', 'Kiwayuu_cha_inde', 'Kiwayuu_cha_Inde', 'kiwayuu_cha_inde');
      }
      // Add "Kiwayuu cha Nje" variants if not already included
      if (!normalized.includes('nje')) {
        additionalBmus.push('Kiwayuu cha Nje', 'Kiwayuu_cha_nje', 'Kiwayuu_cha_Nje', 'kiwayuu_cha_nje');
      }
      // Add "Kiwayuu cha Ndani" variants if not already included
      if (!normalized.includes('ndani')) {
        additionalBmus.push('Kiwayuu cha Ndani', 'Kiwayuu_cha_ndani', 'Kiwayuu_cha_Ndani', 'kiwayuu_cha_ndani');
      }
    }
  });
  
  return Array.from(new Set([...bmus, ...normalizedBmus, ...additionalBmus]));
};

export const gearRouter = createTRPCRouter({
  summaries: protectedProcedure
    .input(z.object({ 
      bmus: z.string().array(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        await getDb(); // Ensure DB connection is established
        
        const allBmus = getAllBmuVariants(input.bmus);
        
        // Prepare match stage with optional date filtering
        const matchStage: any = {
          BMU: { $in: allBmus },
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
        
        return await GearSummaryModel
          .find(matchStage)
          .select({
            _id: 0,
            BMU: 1,
            gear: 1,
            mean_trip_catch: 1,
            mean_effort: 1,
            mean_cpue: 1,
            mean_cpua: 1,
            mean_rpue: 1, 
            mean_rpua: 1,
            mean_cost: 1,
            mean_profit: 1,
            date: 1
          })
          .sort({ date: -1 })
          .exec();
      } catch (error) {
        console.error('Error in gear summaries query:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch gear summaries',
          cause: error,
        });
      }
    }),
});