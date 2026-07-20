"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import superjson from "superjson";

/**
 * 应用根 Providers
 *
 * 整合 tRPC + React Query + NextAuth Session
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            }).then(async (res) => {
              const contentType = res.headers.get("content-type") || "";
              if (
                !contentType.includes("json") &&
                !contentType.includes("trpc")
              ) {
                const peek = await res.clone().text();
                if (/^\s*<(!DOCTYPE|html)/i.test(peek)) {
                  throw new Error(
                    'Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON',
                  );
                }
              }
              return res;
            });
          },
        }),
      ],
    }),
  );

  return (
    <SessionProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  );
}
