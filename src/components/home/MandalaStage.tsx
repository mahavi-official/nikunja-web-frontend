"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MandalaFallback } from "./MandalaFallback";
import { cn } from "@/lib/format";

/**
 * Owns the handoff between the flat mandala and the three-dimensional one.
 *
 * The WebGL canvas is transparent, so the two would otherwise sit on top of
 * each other and read as a double exposure. The flat one holds the frame until
 * the scene reports its first rendered frame, then cross-fades out over a
 * second. If WebGL is unavailable the report never comes and the flat mandala
 * simply stays — which is the correct outcome, not a failure state.
 */

const Mandala3D = dynamic(() => import("./Mandala3D"), { ssr: false });

export function MandalaStage({ className }: { className?: string }) {
  const [live, setLive] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <MandalaFallback
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          live ? "opacity-0" : "opacity-100"
        )}
      />
      <Mandala3D className="absolute inset-0" onReady={() => setLive(true)} />
    </div>
  );
}
