import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const bmuRouter = createTRPCRouter({
  // BMU-related procedures will go here
  ping: publicProcedure.query(() => {
    return "BMU router is working";
  }),
}); 