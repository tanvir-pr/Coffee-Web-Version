"use client";

import { useEffect, useRef } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";
import { rippleAllowed } from "@/lib/motion/could";

export function CoffeeRipple() {
  const on = useCould("11");
  const tier = useTier();
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current?.parentElement;
    if (!zone || !on || tier === "static") return;
    const max = tier === "lite" ? 1 : 3;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest("a,button,input,textarea,select,label") !== null;
      const count = zone.querySelectorAll(".ripple").length;
      if (!rippleAllowed(interactive, window.getSelection()?.toString() ?? "", count, max)) return;
      const rect = zone.getBoundingClientRect();
      const stain = document.createElement("span");
      stain.className = "ripple";
      stain.style.left = `${event.clientX - rect.left}px`;
      stain.style.top = `${event.clientY - rect.top}px`;
      stain.addEventListener("animationend", () => stain.remove(), { once: true });
      zone.appendChild(stain);
    };
    zone.addEventListener("click", onClick);
    return () => zone.removeEventListener("click", onClick);
  }, [on, tier]);

  if (!on || tier === "static") return null;
  return <div ref={zoneRef} hidden />;
}
