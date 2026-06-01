"use client";

import { useEffect, useRef, useState } from "react";
import { LatteLoader } from "@/components/motion/LatteLoader";
import { LOADER_DELAY_MS, LOADER_MIN_MS } from "@/lib/motion/loader";

export function useLoaderVisibility(active: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (active) {
      if (visibleRef.current) return;
      const timer = window.setTimeout(() => {
        visibleRef.current = true;
        shownAt.current = performance.now();
        setVisible(true);
      }, LOADER_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    if (!visibleRef.current) return;
    const wait = Math.max(0, LOADER_MIN_MS - (performance.now() - shownAt.current));
    const timer = window.setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [active]);

  return visible;
}

export function PendingLoader({ active, label }: { active: boolean; label?: string }) {
  const visible = useLoaderVisibility(active);
  if (!visible) return null;
  return <LatteLoader label={label} />;
}
