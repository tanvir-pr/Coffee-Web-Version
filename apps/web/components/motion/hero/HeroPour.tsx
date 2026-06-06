"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type RefObject } from "react";
import { HeroArt } from "@/components/motion/hero/HeroArt";
import { buildHeroTimeline, HERO_LITE_SECONDS, HERO_PIN_DISTANCE, HERO_SNAP, heroState, heroWavePath, waveAmp } from "@/lib/motion/hero";
import type { MotionTier } from "@/lib/motion/tier";

type PlayingTier = Exclude<MotionTier, "static">;

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HeroPour({
  root,
  tier,
  debug,
}: {
  root: RefObject<HTMLElement | null>;
  tier: PlayingTier;
  debug: boolean;
}) {
  const phase = useRef(0);

  useGSAP(
    () => {
      const stage = root.current;
      if (!stage) return;
      const wave = stage.querySelector(".wave");
      const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
      if (tier === "full" && ios) ScrollTrigger.normalizeScroll(true);

      const paint = (progress: number, velocity: number) => {
        const amp = tier === "full" ? waveAmp(progress, velocity) : progress >= 0.1 && progress <= 0.6 ? 3 : 0;
        if (tier === "full") phase.current += velocity * 0.001;
        wave?.setAttribute("d", heroWavePath(amp, phase.current));
        stage.dataset.state = heroState(progress);
        const readout = stage.querySelector("[data-hero-readout]");
        if (readout) readout.textContent = `${heroState(progress)} ${progress.toFixed(2)}`;
      };

      const media = gsap.matchMedia();
      media.add({ desk: "(min-width: 768px)", mob: "(max-width: 767px)" }, (ctx) => {
        const desk = ctx.conditions?.desk === true;
        const reduceScroll = tier !== "full" || !desk;
        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: reduceScroll
            ? {
                trigger: stage,
                start: "top 60%",
                toggleActions: "play none none none",
                once: true,
              }
            : {
                trigger: stage,
                start: "top top",
                end: HERO_PIN_DISTANCE,
                pin: true,
                scrub: 0.6,
                anticipatePin: 1,
                markers: debug,
                snap: { snapTo: [...HERO_SNAP], duration: 0.4 },
              },
        });
        buildHeroTimeline(
          {
            fromTo: (selector, from, to, at) => {
              timeline.fromTo(selector, from, to, at);
            },
            to: (selector, to, at) => {
              timeline.to(selector, to, at);
            },
          },
          { art: tier === "full", desk },
        );
        if (reduceScroll) timeline.timeScale(1 / HERO_LITE_SECONDS);
        timeline.eventCallback("onUpdate", () => {
          paint(timeline.progress(), timeline.scrollTrigger?.getVelocity() ?? 0);
        });
        paint(timeline.progress(), 0);
      });

      const observer = new IntersectionObserver(([entry]) => {
        if (entry) stage.dataset.offscreen = entry.isIntersecting ? "false" : "true";
      });
      observer.observe(stage);

      return () => {
        observer.disconnect();
        media.revert();
        if (tier === "full" && ios) ScrollTrigger.normalizeScroll(false);
      };
    },
    { scope: root, dependencies: [tier, debug] },
  );

  return <HeroArt pose="empty" />;
}
