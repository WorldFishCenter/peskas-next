import { UserModel } from "@repo/nosql/schema/auth";
import { createTRPCRouter, publicProcedure } from "../trpc";

// TODO: Remove this when deploying to production
export const testRouter = createTRPCRouter({
  getUsers: publicProcedure.query(async ({ input, ctx }) => {
    // Get all users
    const users = await UserModel.find({});
    const emails = users.map((user) => user.email);
    return { emails };
  }),
});
