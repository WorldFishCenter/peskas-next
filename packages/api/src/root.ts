import {
  pingRouter,
  aggregatedCatchRouter,
  gearRouter,
  userRouter,
  fishDistributionRouter,
  individualDataRouter,
  individualGearDataRouter,
  usageRouter,
} from "./router";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  ping: pingRouter,
  aggregatedCatch: aggregatedCatchRouter,
  gear: gearRouter,
  user: userRouter,
  fishDistribution: fishDistributionRouter,
  individualData: individualDataRouter,
  individualGearData: individualGearDataRouter,
  usage: usageRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
