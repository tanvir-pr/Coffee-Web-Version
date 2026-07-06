"use client";

import { forwardRef, useRef, type ButtonHTMLAttributes, type PointerEvent as ReactPointerEvent } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { magnetOffset } from "@/lib/motion/should";

function placeRipple(button: HTMLButtonElement, x: number, y: number) {
  const ripple = document.createElement("span");
  ripple.className = "magnetic-ripple";
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  button.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

export const MagneticButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function MagneticButton(
  { className, children, ...props },
  forwarded,
) {
  const tier = useTier();
  const ref = useRef<HTMLButtonElement>(null);

  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const button = ref.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!button || tier !== "full" || !fine) return;
    const rect = button.getBoundingClientRect();
    const x = magnetOffset(event.clientX - (rect.left + rect.width / 2));
    const y = magnetOffset(event.clientY - (rect.top + rect.height / 2));
    button.style.transform = `translate(${x}px, ${y}px)`;
    button.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    button.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <button
      {...props}
      ref={(node) => {
        ref.current = node;
        if (typeof forwarded === "function") forwarded(node);
        else if (forwarded) forwarded.current = node;
      }}
      className={`magnetic ${className ?? ""}`}
      onPointerMove={move}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
      onPointerDown={(event) => {
        props.onPointerDown?.(event);
        if (tier === "static" || !ref.current) return;
        placeRipple(ref.current, event.nativeEvent.offsetX, event.nativeEvent.offsetY);
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (tier === "static" || !ref.current || event.repeat) return;
        if (event.key === "Enter" || event.key === " ") {
          placeRipple(ref.current, ref.current.clientWidth / 2, ref.current.clientHeight / 2);
        }
      }}
    >
      {children}
    </button>
  );
});
