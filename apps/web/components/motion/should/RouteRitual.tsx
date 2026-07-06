"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { ritualMs } from "@/lib/motion/should";

export function RouteRitual() {
  const pathname = usePathname();
  const tier = useTier();
  const skip = useRef(false);
  const first = useRef(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const onPop = () => {
      skip.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (skip.current) {
      skip.current = false;
      return;
    }
    const frame = requestAnimationFrame(() => setPlay(true));
    const timer = window.setTimeout(() => {
      setPlay(false);
      const heading = document.querySelector("h1");
      if (heading instanceof HTMLElement) {
        if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
        heading.focus();
      }
    }, ritualMs(tier));
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname, tier]);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !play || tier !== "full") return;
    const context = surface.getContext("2d");
    if (!context) return;
    const particles = Array.from({ length: 24 }, (_, index) => {
      const angle = (index / 24) * Math.PI * 2;
      return { x: 80, y: 50, vx: Math.cos(angle) * (2 + (index % 4)), vy: Math.sin(angle) * 2 };
    });
    let frame = 0;
    const draw = () => {
      context.clearRect(0, 0, 160, 100);
      context.fillStyle = "#3B2217";
      for (const particle of particles) {
        particle.vy += 0.08;
        particle.x += particle.vx;
        particle.y += particle.vy;
        const pull = (80 - particle.x) * 0.02;
        particle.vx += pull;
        context.beginPath();
        context.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [play, tier]);

  if (!play) return null;
  return (
    <div className="route-ritual" aria-hidden>
      {tier === "full" ? <canvas ref={canvas} width={160} height={100} /> : <span className="ritual-bean" />}
    </div>
  );
}
