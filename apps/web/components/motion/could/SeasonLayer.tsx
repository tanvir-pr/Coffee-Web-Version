"use client";

import { useEffect, useRef } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould, useSeason } from "@/app/providers/AnimFlags";
import { particleCount } from "@/lib/motion/could";

type Particle = { x: number; y: number; vy: number; spin: number; size: number };

const COPY: Record<string, string> = {
  autumn: "Leaves on the counter.",
  winter: "Snow on the window.",
  spring: "Blossom over the matcha.",
  summer: "Nitro bubbles rising.",
};

function velocity(theme: string): [number, number] {
  if (theme === "winter") return [15, 35];
  if (theme === "spring") return [10, 25];
  if (theme === "summer") return [-45, -25];
  return [30, 60];
}

export function SeasonBanner() {
  const on = useCould("16");
  const season = useSeason();
  const tier = useTier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const headline = headlineRef.current;
    if (!canvas || !on || tier === "static") return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const count = particleCount(season, tier, mobile);
    const [minVy, maxVy] = velocity(season);
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      vy: minVy + Math.random() * (maxVy - minVy),
      spin: season === "autumn" || season === "spring" ? Math.random() * 2 : 0,
      size: 3 + Math.random() * 4,
    }));
    let frame = 0;
    let last = performance.now();
    let playing = true;
    let wind = 0;
    let lastScroll = window.scrollY;
    let step = 0;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const draw = (now: number) => {
      if (!playing || document.hidden) {
        frame = 0;
        return;
      }
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      step += 1;
      if (tier === "lite" && step % 2 === 1) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const avoid = headline?.getBoundingClientRect();
      if (tier === "full") {
        const velocityY = (window.scrollY - lastScroll) / Math.max(delta, 0.016);
        lastScroll = window.scrollY;
        wind += (velocityY * 0.02 - wind) * 0.1;
      }
      context.clearRect(0, 0, rect.width, rect.height);
      context.fillStyle = season === "winter" ? "#F7F4EE" : season === "summer" ? "#C8DDA8" : "#D98A3D";
      for (const particle of particles) {
        particle.y += (particle.vy * delta) / rect.height;
        particle.x += ((wind + particle.spin) * delta) / rect.width;
        if (particle.y > 1.05) particle.y = -0.05;
        if (particle.y < -0.05) particle.y = 1.05;
        if (particle.x > 1.05) particle.x = -0.05;
        if (particle.x < -0.05) particle.x = 1.05;
        const x = particle.x * rect.width;
        const y = particle.y * rect.height;
        if (avoid) {
          const left = avoid.left - rect.left;
          const top = avoid.top - rect.top;
          if (x > left && x < left + avoid.width && y > top && y < top + avoid.height) continue;
        }
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      playing = entry?.isIntersecting === true;
      if (playing && frame === 0) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    });
    observer.observe(canvas);
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => {
      playing = false;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [on, season, tier]);

  if (!on) return null;
  return (
    <div className="season-banner">
      {tier === "static" ? (
        <svg className="season-still" viewBox="0 0 120 36" aria-hidden>
          <circle cx="18" cy="18" r="6" fill="#D98A3D" />
          <circle cx="42" cy="14" r="4" fill="#F7F4EE" />
          <circle cx="66" cy="20" r="5" fill="#C8DDA8" />
          <circle cx="92" cy="12" r="3" fill="#8DBF6A" />
        </svg>
      ) : (
        <canvas ref={canvasRef} className="season-layer" aria-hidden />
      )}
      <h2 ref={headlineRef} id="season-headline" className="relative z-10 font-display text-3xl font-semibold">
        {COPY[season] ?? COPY.autumn}
      </h2>
    </div>
  );
}
