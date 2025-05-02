import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  // Auth-related procedures will go here
  ping: publicProcedure.query(() => {
    return "Auth router is working";
  }),
}); 