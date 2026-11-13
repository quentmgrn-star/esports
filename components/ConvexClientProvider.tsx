"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
// The site still renders without a Convex URL (e.g. first Vercel deploy); forms then only work locally.
export const convex = url ? new ConvexReactClient(url) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
