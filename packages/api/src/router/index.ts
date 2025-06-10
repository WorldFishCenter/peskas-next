import { userRouter } from "./user";
import { authRouter } from "./auth";
import { aggregatedCatchRouter } from "./aggregated-catch";
import { bmuRouter } from "./bmu";
import { gearRouter } from "./gear";
import { monthlyStatsRouter } from "./monthly-stats";
import { fishDistributionRouter } from "./fish-distribution";
import { pingRouter } from "./ping";
import { mapDistributionRouter } from "./map-distribution";
import { individualDataRouter } from "./individual-data";

// Export all routers for easier imports
export {
  userRouter,
  authRouter,
  aggregatedCatchRouter,
  bmuRouter,
  gearRouter,
  monthlyStatsRouter,
  fishDistributionRouter,
  pingRouter,
  mapDistributionRouter,
  individualDataRouter,
}; 