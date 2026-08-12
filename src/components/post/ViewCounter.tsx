"use client";

import { useEffect, useRef } from "react";
import { recordView } from "@/lib/api";

/**
 * Fire-and-forget view ping, once per mount. Renders nothing, blocks nothing,
 * and a failure is silently ignored — a missed count is not worth an error.
 */
export function ViewCounter({ kind, slug }: { kind: "posts" | "videos"; slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const timer = window.setTimeout(() => void recordView(kind, slug), 1500);
    return () => window.clearTimeout(timer);
  }, [kind, slug]);

  return null;
}
