"use client";

import { useEffect, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";
import { tiltTarget } from "@/lib/motion/could";

type OrientationEvent = Event & { gamma?: number | null };
type Permissioned = { requestPermission?: () => Promise<string> };

function apply(angle: number) {
  document.getElementById("hero")?.style.setProperty("--tilt", `${angle}deg`);
  document.querySelector<HTMLElement>(".live-cup")?.style.setProperty("--tilt", `${angle}deg`);
}

export function TiltControl() {
  const on = useCould("20");
  const tier = useTier();
  const [coarse, setCoarse] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCoarse(window.matchMedia("(pointer: coarse)").matches && "DeviceOrientationEvent" in window);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let pending: number | null = null;
    const onOrientation = (event: Event) => {
      pending = tiltTarget((event as OrientationEvent).gamma ?? null);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pending !== null) apply(pending);
      });
    };
    const onHide = () => {
      if (document.hidden) apply(0);
    };
    window.addEventListener("deviceorientation", onOrientation);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      document.removeEventListener("visibilitychange", onHide);
      if (frame) cancelAnimationFrame(frame);
      apply(0);
    };
  }, [active]);

  if (!on || tier !== "full" || !coarse) return null;

  return (
    <button
      type="button"
      className="font-sans text-sm text-muted"
      onClick={() => {
        const sensor = DeviceOrientationEvent as unknown as Permissioned;
        if (typeof sensor.requestPermission === "function") {
          void sensor.requestPermission().then((result) => {
            if (result === "granted") setActive(true);
          });
          return;
        }
        setActive(true);
      }}
    >
      {active ? "Cup follows the phone" : "Let the cup stay level"}
    </button>
  );
}
