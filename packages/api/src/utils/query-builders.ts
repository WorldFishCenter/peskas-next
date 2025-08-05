import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";

/**
 * Build MongoDB date filter stage for aggregation pipelines
 * @param startDate - Optional start date string
 * @param endDate - Optional end date string
 * @returns MongoDB date filter object
 */
export const buildDateFilterStage = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return {};
  
  const dateFilter: any = {};
  if (startDate) {
    dateFilter.$gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.$lte = new Date(endDate);
  }
  
  return { date: dateFilter };
};

/**
 * Build MongoDB match stage for BMU filtering
 * @param bmus - Array of BMU names
 * @param additionalFilters - Additional filter conditions
 * @returns MongoDB match stage object
 */
export const buildBMUMatchStage = (bmus: string[], additionalFilters: any = {}) => ({
  BMU: { $in: bmus },
  ...additionalFilters
});

/**
 * Build MongoDB match stage with BMUs and date filtering
 * @param bmus - Array of BMU names
 * @param startDate - Optional start date string
 * @param endDate - Optional end date string
 * @param additionalFilters - Additional filter conditions
 * @returns Complete match stage object
 */
export const buildMatchStage = (
  bmus: string[], 
  startDate?: string, 
  endDate?: string, 
  additionalFilters: any = {}
) => ({
  ...buildBMUMatchStage(bmus),
  ...buildDateFilterStage(startDate, endDate),
  ...additionalFilters
});

/**
 * Build MongoDB match stage for individual fisher queries
 * @param fisherId - Fisher ID
 * @param startDate - Optional start date string
 * @param endDate - Optional end date string
 * @param additionalFilters - Additional filter conditions
 * @returns Match stage for fisher-specific queries
 */
export const buildFisherMatchStage = (
  fisherId: string,
  startDate?: string,
  endDate?: string,
  additionalFilters: any = {}
) => ({
  fisher_id: fisherId,
  ...buildDateFilterStage(startDate, endDate),
  ...additionalFilters
});

/**
 * Higher-order function to wrap tRPC procedures with DB connection and error handling
 * @param handler - The procedure handler function
 * @returns Wrapped handler with DB connection and error handling
 */
export const withDbConnection = <T>(
  handler: (input: any, ctx: any) => Promise<T>,
  errorMessage: string = 'Database operation failed'
) => {
  return async (input: any, ctx: any): Promise<T> => {
    try {
      await getDb(); // Ensure DB connection is established
      return await handler(input, ctx);
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: errorMessage,
        cause: error,
      });
    }
  };
};

/**
 * Common aggregation stages for performance calculations
 */
export const getPerformanceProjectionStage = (maxFields: string[]) => {
  const projectionStage: any = {
    _id: 0,
    bmu: "$bmus._id",
    monthlyData: "$bmus.monthlyData"
  };

  // Add average fields
  maxFields.forEach(field => {
    projectionStage[`avg${field.charAt(0).toUpperCase() + field.slice(1)}`] = `$bmus.avg${field.charAt(0).toUpperCase() + field.slice(1)}`;
  });

  // Add performance calculations
  maxFields.forEach(field => {
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
    projectionStage[`${field}Performance`] = {
      $multiply: [
        { $divide: [`$bmus.avg${fieldName}`, `$max${fieldName}`] },
        100
      ]
    };
  });

  return projectionStage;
};

/**
 * Common month name mapping for aggregations
 */
export const getMonthNameStage = () => ({
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
  }
});

/**
 * Common rounding projection for numeric fields
 * @param fields - Array of field names to round
 * @param decimals - Number of decimal places (default: 2)
 */
export const getRoundingProjection = (fields: string[], decimals: number = 2) => {
  const projection: any = { _id: 0 };
  
  fields.forEach(field => {
    projection[field] = { $round: [`$${field}`, decimals] };
  });
  
  return projection;
};