"use client";

import { m, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { revealDuration, revealY, staggerGap } from "@/lib/motion/reveal";

export function StaggerList({
  children,
  className = "",
}: {
  children: ReactNode[];
  className?: string;
}) {
  const tier = useTier();
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6% 0px" });
  const duration = revealDuration(tier);
  const y = revealY(tier);
  const gap = staggerGap(tier);

  if (tier === "static") {
    return (
      <ul ref={ref} className={className}>
        {children.map((child, index) => (
          <li key={index}>{child}</li>
        ))}
      </ul>
    );
  }

  return (
    <ul ref={ref} className={className}>
      {children.map((child, index) => (
        <m.li
          key={index}
          initial={{ opacity: 0, y }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
          transition={{ duration, delay: index * gap, ease: [0.22, 0.8, 0.2, 1] }}
        >
          {child}
        </m.li>
      ))}
    </ul>
  );
}
