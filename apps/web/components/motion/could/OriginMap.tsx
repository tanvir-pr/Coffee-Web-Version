"use client";

import { useEffect, useRef } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";

const STOPS = [
  { title: "Sidama farm", detail: "Ethiopia · 1,900 m · washed · citrus, tea, cane sugar" },
  { title: "Roastery", detail: "Small-batch drum · caramel and cocoa develop here" },
  { title: "Crema café", detail: "Riverside · poured to order" },
];

export function OriginMap() {
  const on = useCould("19");
  const tier = useTier();
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope || !on || tier === "static") return;
    let cancel = () => {};
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      void import("gsap").then(async ({ default: gsap }) => {
        const { MotionPathPlugin } = await import("gsap/MotionPathPlugin");
        gsap.registerPlugin(MotionPathPlugin);
        const query = gsap.utils.selector(scope);
        const timeline = gsap.timeline({ paused: true });
        timeline
          .to(query(".origin-pin .pulse"), { scale: 2, autoAlpha: 0, repeat: 1, duration: 0.1 })
          .to(query(".origin-bean"), {
            duration: 0.8,
            ease: "none",
            motionPath: { path: "#origin-route", align: "#origin-route", autoRotate: true, alignOrigin: [0.5, 0.5] },
          })
          .from(query(".origin-note"), { y: 8, autoAlpha: 0, duration: 0.08 }, 0.45)
          .from(query(".cafe-pin"), { y: -12, ease: "back.out(2)", duration: 0.1 }, 0.9);
        if (cancelled) {
          timeline.kill();
          return;
        }
        if (tier === "full") {
          const { ScrollTrigger } = await import("gsap/ScrollTrigger");
          gsap.registerPlugin(ScrollTrigger);
          const trigger = ScrollTrigger.create({
            trigger: scope,
            start: "top 70%",
            end: "bottom 30%",
            scrub: 0.8,
            animation: timeline,
          });
          cancel = () => {
            trigger.kill();
            timeline.kill();
          };
          return;
        }
        timeline.timeScale(timeline.duration() / 2);
        const observer = new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) timeline.play();
        });
        observer.observe(scope);
        cancel = () => {
          observer.disconnect();
          timeline.kill();
        };
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancel();
    };
  }, [on, tier]);

  return (
    <section
      ref={root}
      className={on && tier === "full" ? "origin-map origin-map-scrub" : "origin-map"}
      aria-labelledby="origin-title"
    >
      <h2 id="origin-title" className="font-display text-3xl font-semibold">
        The route
      </h2>
      <svg viewBox="0 0 640 220" className="mt-4 w-full" role="img" aria-label="Bean route from Sidama to Crema">
        <path id="origin-route" d="M48 160 C 180 160, 220 50, 320 70 S 500 180, 590 110" fill="none" stroke="currentColor" strokeDasharray="5 7" />
        <g className="origin-pin">
          <circle cx="48" cy="160" r="14" className="pulse" fill="none" stroke="currentColor" />
          <circle cx="48" cy="160" r="5" fill="#2B1A12" />
        </g>
        <circle className="origin-bean" cx="48" cy="160" r="6" fill="#3B2217" />
        <circle className="cafe-pin" cx="590" cy="110" r="6" fill="#8DBF6A" />
      </svg>
      <p className="origin-note font-sans text-sm text-muted" aria-hidden>
        The bean passes the roastery halfway along the route.
      </p>
      <ol className="mt-4 flex flex-col gap-3">
        {STOPS.map((stop, index) => (
          <li key={stop.title} className={index === 1 ? "card-roastery" : undefined}>
            <p className="font-sans font-semibold">{stop.title}</p>
            <p className="font-sans text-sm text-muted">{stop.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
