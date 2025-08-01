import {
  pingRouter,
  aggregatedCatchRouter,
  mapDistributionRouter,
  gearRouter,
  monthlyStatsRouter,
  userRouter,
  fishDistributionRouter,
  individualDataRouter,
  individualGearDataRouter,
} from "./router";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  ping: pingRouter,
  aggregatedCatch: aggregatedCatchRouter,
  gear: gearRouter,
  mapDistribution: mapDistributionRouter,
  monthlyStats: monthlyStatsRouter,
  user: userRouter,
  fishDistribution: fishDistributionRouter,
  individualData: individualDataRouter,
  individualGearData: individualGearDataRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
