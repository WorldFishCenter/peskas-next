import { z } from "zod";
import { TRPCError } from "@trpc/server";
import getDb from "@repo/nosql";
import { AppUsageSessionModel } from "@repo/nosql/schema/app-usage";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * Shape of the authenticated user carried on the session. The `next-auth`
 * module augmentation lives in the app package, so within this package we cast
 * to the fields we rely on (same approach as `user.ts`).
 */
type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  groups?: { name?: string }[];
  userBmu?: { BMU?: string };
  fisherId?: string;
};

/**
 * Derive a single role label reflecting the dashboard the user actually sees.
 * Precedence mirrors `file/dashboard/index.tsx`: an IIA user with a fisherId is
 * routed to the individual view first, then admin > WBCIA > AIA > CIA, and a
 * bare IIA (no fisherId) falls through last. The raw `groups` array is also
 * stored, so this is only a convenience label.
 */
function deriveRole(groups: { name?: string }[], fisherId?: string): string {
  const names = groups.map((g) => g?.name).filter(Boolean) as string[];
  const has = (n: string) => names.includes(n);
  const isAdmin = names.some((n) => n === "admin" || n === "Admin");
  const isIia = has("IIA");
  if (isIia && fisherId) return "IIA";
  if (isAdmin) return "admin";
  if (has("WBCIA")) return "WBCIA";
  if (has("AIA")) return "AIA";
  if (has("CIA")) return "CIA";
  if (isIia) return "IIA";
  return "unknown";
}

const HeartbeatInput = z.object({
  /** Stable per-tab session id generated on the client. */
  sessionId: z.string().min(1).max(128),
  /** Current route path (as reported by usePathname). */
  path: z.string().max(512).optional(),
  /**
   * Active (tab-visible) time accrued since the last heartbeat, ms. Clamped
   * (not rejected) to a sane ceiling so a large/garbage value never drops an
   * otherwise-valid heartbeat.
   */
  activeMsDelta: z
    .number()
    .int()
    .min(0)
    .default(0)
    .transform((v) => Math.min(v, 10 * 60 * 1000)),
  /** True when this heartbeat marks a new route navigation (counts a view). */
  newView: z.boolean().default(false),
  language: z.string().max(16).optional(),
  userAgent: z.string().max(1024).optional(),
});

export const usageRouter = createTRPCRouter({
  /**
   * Records app usage for the current session. Called periodically (and on
   * route change / tab hide) by the client-side UsageTracker. Upserts a single
   * `app_usage_sessions` document per `sessionId`, accumulating active time and
   * per-route stats.
   */
  heartbeat: protectedProcedure
    .input(HeartbeatInput)
    .mutation(async ({ input, ctx }) => {
      try {
        await getDb();

        const user = ctx.session.user as SessionUser;
        const now = new Date();
        const groups = Array.isArray(user.groups) ? user.groups : [];
        const groupNames = groups
          .map((g) => g?.name)
          .filter((name): name is string => Boolean(name));
        const role = deriveRole(groups, user.fisherId);

        // Build $set / $setOnInsert without undefined values so we don't
        // write null placeholders into the document.
        const set: Record<string, unknown> = {
          lastSeenAt: now,
          updated_at: now,
          role,
          groups: groupNames,
        };
        if (user.userBmu?.BMU) set.bmu = user.userBmu.BMU;
        if (input.language) set.language = input.language;
        if (input.userAgent) set.userAgent = input.userAgent;

        const setOnInsert: Record<string, unknown> = {
          sessionId: input.sessionId,
          startedAt: now,
          created_at: now,
        };
        if (user.id) setOnInsert.userId = user.id;
        if (user.email) setOnInsert.userEmail = user.email;
        if (user.name) setOnInsert.userName = user.name;
        if (user.fisherId) setOnInsert.fisherId = user.fisherId;

        await AppUsageSessionModel.updateOne(
          { sessionId: input.sessionId },
          {
            $setOnInsert: setOnInsert,
            $set: set,
            $inc: {
              activeMs: input.activeMsDelta,
              pageViews: input.newView ? 1 : 0,
            },
          },
          { upsert: true }
        );

        // Per-route aggregate: increment the matching page entry, or push a new
        // one if this path hasn't been seen in this session yet.
        if (input.path) {
          const inc: Record<string, number> = {
            "pages.$.activeMs": input.activeMsDelta,
          };
          if (input.newView) inc["pages.$.views"] = 1;

          const res = await AppUsageSessionModel.updateOne(
            { sessionId: input.sessionId, "pages.path": input.path },
            { $inc: inc, $set: { "pages.$.lastVisitedAt": now } }
          );

          if (res.matchedCount === 0) {
            await AppUsageSessionModel.updateOne(
              { sessionId: input.sessionId },
              {
                $push: {
                  pages: {
                    path: input.path,
                    views: input.newView ? 1 : 0,
                    activeMs: input.activeMsDelta,
                    lastVisitedAt: now,
                  },
                },
              }
            );
          }
        }

        return { ok: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record app usage",
          cause: error,
        });
      }
    }),
});
