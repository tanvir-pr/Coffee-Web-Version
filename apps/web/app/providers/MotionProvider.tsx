"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { detectTier, watchFps, type MotionTier } from "@/lib/motion/tier";
import { spring } from "@/lib/motion/tokens";

const TierCtx = createContext<MotionTier>("lite");

export function useTier(): MotionTier {
  return useContext(TierCtx);
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<MotionTier>("lite");

  useEffect(() => {
    document.documentElement.dataset.motion = tier;
  }, [tier]);

  useEffect(() => {
    let stop = () => {};
    const frame = requestAnimationFrame(() => {
      const next = detectTier();
      setTier(next);
      if (next === "full") stop = watchFps(() => setTier("lite"));
    });
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, []);

  return (
    <TierCtx.Provider value={tier}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user" transition={spring.snappy}>
          {children}
        </MotionConfig>
      </LazyMotion>
    </TierCtx.Provider>
  );
}
