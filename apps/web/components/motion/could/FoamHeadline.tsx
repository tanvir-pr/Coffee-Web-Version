"use client";

import { m } from "motion/react";
import { useId } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";
import { FOAM_INK, FOAM_PANEL } from "@/lib/motion/could";

export function FoamHeadline({ children }: { children: string }) {
  const on = useCould("21");
  const tier = useTier();
  const maskId = useId().replaceAll(":", "");

  if (!on || tier === "static") {
    return <h1 className="font-display text-5xl font-semibold tracking-tight">{children}</h1>;
  }

  return (
    <h1 className="foam-h">
      <span className="sr-only">{children}</span>
      <svg aria-hidden viewBox="0 0 640 96" className="w-full">
        <mask id={maskId}>
          <m.rect
            height="96"
            fill="#fff"
            initial={{ width: 0 }}
            whileInView={{ width: 640 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
          />
        </mask>
        <rect width="640" height="96" rx="16" fill={FOAM_PANEL} />
        <text mask={`url(#${maskId})`} x="24" y="60" fill={FOAM_INK} fontSize="36" fontFamily="var(--font-fraunces), serif">
          {children}
        </text>
        {tier === "full" ? <circle className="foam-bubble" cx="28" cy="48" r="5" fill={FOAM_INK} /> : null}
      </svg>
    </h1>
  );
}
