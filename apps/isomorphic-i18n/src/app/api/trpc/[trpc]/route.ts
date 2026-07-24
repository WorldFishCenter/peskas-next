import { appRouter, createTRPCContext } from "@isomorphic/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
function setCorsHeaders(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
}

export function OPTIONS() {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
}

const handler = async (req: any) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: async () => {
      // Resolve the full session (with the custom `session` callback applied, so
      // `groups`/`id`/`userBmu`/`fisherId` are present) instead of relying on
      // `req.auth`, which NextAuth v4 does not populate here. Mirrors trpc/server.ts.
      return createTRPCContext({
        session: await getServerSession(authOptions),
        headers: req.headers,
      });
    },
    onError({ error, path }) {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
    // batching: { enabled: false },
  });

  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };
