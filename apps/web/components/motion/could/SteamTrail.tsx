"use client";

import { useEffect, useRef } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";
import { canSpawnSteam } from "@/lib/motion/could";

type Wisp = { x: number; y: number; born: number; drift: number };

function curl(x: number, y: number): number {
  const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return noise - Math.floor(noise);
}

export function SteamTrail() {
  const on = useCould("06");
  const tier = useTier();
  const zoneRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = zoneRef.current;
    const zone = canvas?.parentElement;
    if (!canvas || !zone || !on || tier !== "full") return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const wisps: Wisp[] = [];
    let frame = 0;
    let last = { x: 0, y: 0 };
    let moved = false;

    const fit = () => {
      const rect = zone.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const draw = (now: number) => {
      const rect = zone.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      for (let index = wisps.length - 1; index >= 0; index -= 1) {
        const wisp = wisps[index];
        if (!wisp) continue;
        const age = (now - wisp.born) / 1600;
        if (age >= 1) {
          wisps.splice(index, 1);
          continue;
        }
        const rise = age * 40;
        const drift = (curl(wisp.x, now / 400) - 0.5) * 16 + wisp.drift;
        const opacity = age < 0.5 ? age * 0.7 : (1 - age) * 0.7;
        context.beginPath();
        context.strokeStyle = `rgba(247, 241, 232, ${opacity.toFixed(3)})`;
        context.lineWidth = 1.4 + age;
        context.moveTo(wisp.x, wisp.y - rise);
        context.quadraticCurveTo(wisp.x + drift, wisp.y - rise * 0.5, wisp.x + drift * 0.4, wisp.y);
        context.stroke();
      }
      frame = wisps.length > 0 ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (event: PointerEvent) => {
      const rect = zone.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const distance = Math.hypot(point.x - last.x, point.y - last.y);
      const touch = event.pointerType === "touch";
      if (!moved || canSpawnSteam(distance, wisps.length, touch)) {
        if (moved && !canSpawnSteam(distance, wisps.length, touch)) return;
        wisps.push({ x: point.x, y: point.y, born: performance.now(), drift: (curl(point.x, point.y) - 0.5) * 8 });
        last = point;
        moved = true;
        if (frame === 0) frame = requestAnimationFrame(draw);
      }
    };

    zone.addEventListener("pointermove", onMove, { passive: true });
    const observer = new ResizeObserver(fit);
    observer.observe(zone);
    return () => {
      zone.removeEventListener("pointermove", onMove);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [on, tier]);

  if (!on || tier !== "full") return null;
  return <canvas ref={zoneRef} className="steam-trail" aria-hidden />;
}
