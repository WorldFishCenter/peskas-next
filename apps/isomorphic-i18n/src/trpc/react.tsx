"use client";

import React, { Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import SuperJSON from "superjson";
import { AppRouter } from "@isomorphic/api";

export const api = createTRPCReact<AppRouter>();

// https://tanstack.com/query/latest/docs/framework/react/devtools
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import("@tanstack/react-query-devtools/build/modern/production.js").then(
    (d) => ({
      default: d.ReactQueryDevtools,
    })
  )
);

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnMount: false,
            refetchOnReconnect: false,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [showDevtools, setShowDevtools] = useState(
    process.env.NODE_ENV === "development" && false
  );
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchLink({
          // Chart queries send the full accessible-BMU list as input, which alone is
          // ~700 chars of URL-encoded GET query string. `window.location.origin` is
          // prepended, so a short production domain squeaked under the old 750 cap
          // while any longer Vercel preview host (…-git-<branch>-<team>.vercel.app)
          // pushed single queries over it. tRPC's dataLoader then rejects an
          // over-length query client-side with "Input is too big for a single
          // dispatch" — the request is never sent and the chart renders empty.
          // 4000 stays well under Vercel's request-head limit and every browser's
          // URL limit, while still splitting batches instead of sending one huge URL.
          // ponytail: raises the ceiling; the real shrink is deriving the BMU scope
          // from the session server-side instead of shipping 35 names per query.
          maxURLLength: 4000,
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          async headers() {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    })
  );

  useEffect(() => {
    // @ts-expect-error -- add toggleDevtools to window
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
        {showDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtoolsProduction buttonPosition="bottom-left" />
          </Suspense>
        )}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
