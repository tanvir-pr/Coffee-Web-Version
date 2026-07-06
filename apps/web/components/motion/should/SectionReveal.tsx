"use client";

import { m, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { revealDuration, revealY } from "@/lib/motion/reveal";

export function SectionReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const tier = useTier();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const duration = revealDuration(tier);
  const y = revealY(tier);

  if (tier === "static") {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration, delay, ease: [0.22, 0.8, 0.2, 1] }}
    >
      {children}
    </m.div>
  );
}
