"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTier } from "@/app/providers/MotionProvider";

type GlassMode = "filter" | "solid" | "lite";

export function GlassSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const tier = useTier();
  const [canBlur, setCanBlur] = useState(true);

  useEffect(() => {
    const supports = window.CSS?.supports?.bind(window.CSS);
    const can =
      !!supports &&
      (supports("backdrop-filter", "blur(1px)") || supports("-webkit-backdrop-filter", "blur(1px)"));
    const frame = requestAnimationFrame(() => setCanBlur(can));
    return () => cancelAnimationFrame(frame);
  }, []);

  const mode: GlassMode = tier === "lite" ? "lite" : canBlur ? "filter" : "solid";

  return (
    <div data-glass={mode} className={`glass-surface ${className}`}>
      {children}
    </div>
  );
}
