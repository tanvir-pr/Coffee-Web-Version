"use client";

import { useEffect, useRef, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";

const STORAGE_KEY = "crema:airflow";

type Wisp = { x: number; y: number; vx: number; life: number; born: number; thick: number };
type Intro = "hero" | "soft" | "immediate";

function readAirflow(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    return true;
  }
}

export function useAirflow() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOn(readAirflow()));
    const sync = () => setOn(readAirflow());
    window.addEventListener("crema:airflow", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("crema:airflow", sync);
    };
  }, []);

  function toggle() {
    const next = !on;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* preference optional */
    }
    setOn(next);
    window.dispatchEvent(new Event("crema:airflow"));
  }

  return { on, toggle };
}

export function AirflowToggle() {
  const { on, toggle } = useAirflow();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      className={`rounded-full px-4 py-2 font-sans text-sm ${
        on ? "bg-primary text-on-primary" : "bg-surface/70 text-foreground"
      }`}
    >
      Airflow {on ? "on" : "off"}
    </button>
  );
}

function heroPouring(state: string | undefined) {
  return state === "pouring" || state === "settling" || state === "steaming" || state === "revealing" || state === "released";
}

export function AirflowField({
  className = "",
  intro = "immediate",
}: {
  className?: string;
  intro?: Intro;
}) {
  const { on } = useAirflow();
  const tier = useTier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [armed, setArmed] = useState(intro === "immediate");

  useEffect(() => {
    if (!on || tier === "static") {
      setArmed(false);
      return;
    }
    if (intro === "immediate") {
      setArmed(true);
      return;
    }

    let cancelled = false;
    let softTimer = 0;
    let observer: MutationObserver | IntersectionObserver | null = null;

    if (intro === "hero") {
      const stage = document.getElementById("hero");
      if (!stage) {
        setArmed(false);
        return;
      }
      const check = () => {
        if (cancelled) return;
        if (heroPouring(stage.dataset.state)) setArmed(true);
      };
      check();
      observer = new MutationObserver(check);
      observer.observe(stage, { attributes: true, attributeFilter: ["data-state"] });
    } else {
      const canvas = canvasRef.current;
      const target = canvas?.parentElement;
      if (!target) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting || cancelled) return;
          softTimer = window.setTimeout(() => {
            if (!cancelled) setArmed(true);
          }, 900);
          observer?.disconnect();
        },
        { threshold: 0.28 },
      );
      observer.observe(target);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(softTimer);
      observer?.disconnect();
    };
  }, [on, tier, intro]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !on || !armed || tier === "static") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0;
    let H = 0;
    const wisps: Wisp[] = [];
    const maxBase = tier === "lite" ? 14 : 28;
    const fadeMs = intro === "hero" ? 3200 : intro === "soft" ? 2600 : 1;
    const startedAt = performance.now();

    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const intensityAt = (now: number) => {
      if (fadeMs <= 1) return 1;
      const t = Math.min(1, (now - startedAt) / fadeMs);
      return t * t * (3 - 2 * t);
    };

    const spawn = (force = false) => {
      const intensity = intensityAt(performance.now());
      const max = Math.max(1, Math.floor(maxBase * intensity));
      if (!force && wisps.length >= max) return;
      if (!force && intensity < 0.08) return;
      wisps.push({
        x: -20 - Math.random() * 40,
        y: H * (0.12 + Math.random() * 0.7),
        vx: 0.45 + Math.random() * 0.75,
        life: 1,
        born: performance.now(),
        thick: 0.7 + Math.random() * 1.3,
      });
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      const intensity = intensityAt(now);
      canvas.style.opacity = intensity.toFixed(3);
      if (!document.hidden && intensity > 0.02) {
        const spawnChance = 0.82 - intensity * 0.28;
        if (wisps.length < Math.floor(maxBase * intensity) && Math.random() > spawnChance) spawn();
        for (let index = wisps.length - 1; index >= 0; index -= 1) {
          const wisp = wisps[index];
          if (!wisp) continue;
          const age = (now - wisp.born) / 4200;
          wisp.x += wisp.vx + Math.sin(now / 700 + wisp.y) * 0.35;
          wisp.y += Math.sin(now / 500 + wisp.x * 0.02) * 0.28;
          wisp.life = 1 - age;
          if (age >= 1 || wisp.x > W + 40) {
            wisps.splice(index, 1);
            continue;
          }
          const alpha = Math.max(0, wisp.life) * 0.28 * intensity;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(247, 238, 227, ${alpha.toFixed(3)})`;
          ctx.lineWidth = wisp.thick;
          ctx.lineCap = "round";
          ctx.moveTo(wisp.x, wisp.y);
          ctx.bezierCurveTo(wisp.x + 18, wisp.y - 6, wisp.x + 36, wisp.y + 5, wisp.x + 54, wisp.y - 2);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    fit();
    canvas.style.opacity = "0";
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, [on, armed, tier, intro]);

  if (!on || tier === "static") return null;
  return <canvas ref={canvasRef} className={`airflow-field ${className}`} aria-hidden="true" />;
}
