"use client";

import Link from "next/link";
import { m } from "motion/react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { HeroArt } from "@/components/motion/hero/HeroArt";
import { HERO_CARDS } from "@/lib/motion/hero";
import { detectTier, type MotionTier } from "@/lib/motion/tier";

type PourComponent = ComponentType<{
  root: RefObject<HTMLElement | null>;
  tier: Exclude<MotionTier, "static">;
  debug: boolean;
}>;

export function HeroShell({ children, debug }: { children: ReactNode; debug: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [tier, setTier] = useState<MotionTier | null>(null);
  const [Pour, setPour] = useState<PourComponent | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next = detectTier();
      setTier(next);
      if (next === "static") return;
      void import("@/components/motion/hero/HeroPour").then((mod) => setPour(() => mod.HeroPour));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const playing = (tier === "full" || tier === "lite") && Pour !== null;

  return (
    <section
      id="hero"
      ref={root}
      className={tier === "static" ? "hero-poster" : "hero-pour"}
      data-state={tier === "static" ? "released" : "pinned"}
      aria-label="Coffee pour"
    >
      <div className="hero-layout">
        <GlassSurface className="hero-copy w-full px-8 py-10 sm:px-12 sm:py-12">{children}</GlassSurface>
        <div className="hero-stage-art">
          {playing && Pour ? <Pour root={root} tier={tier} debug={debug} /> : <HeroArt pose={tier === "static" ? "served" : "empty"} />}
        </div>
        <ul className="hero-cards" aria-label="On the counter">
          {HERO_CARDS.map((card) => (
            <li key={card.href}>
              <m.div className="menu-card rounded-3xl" whileHover={playing ? { y: -4 } : undefined} transition={{ duration: 0.16 }}>
                <Link href={card.href} className="block px-5 py-4">
                  <span className="block font-sans text-lg font-semibold">{card.name}</span>
                  <span className="mt-1 block font-sans text-sm text-muted">{card.note}</span>
                </Link>
              </m.div>
            </li>
          ))}
        </ul>
      </div>
      {debug ? (
        <p data-hero-readout className="hero-debug" aria-hidden="true">
          pinned 0.00
        </p>
      ) : null}
    </section>
  );
}
