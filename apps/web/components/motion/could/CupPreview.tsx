"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";

export function CupPreview({ color }: { color: string }) {
  const on = useCould("07");
  const tier = useTier();
  const box = useRef<HTMLDivElement>(null);
  const [Scene, setScene] = useState<ComponentType<{ color: string }> | null>(null);
  const [lost, setLost] = useState(false);
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    const node = box.current;
    if (!node || !Scene) return;
    const onLost = () => setLost(true);
    node.addEventListener("crema-webgl-lost", onLost);
    return () => node.removeEventListener("crema-webgl-lost", onLost);
  }, [Scene]);

  if (!on || tier === "static") return null;

  if (tier === "lite") {
    return (
      <button
        type="button"
        className="font-sans text-sm text-muted"
        onPointerDown={(event) => {
          const origin = event.clientX;
          const move = (pointer: PointerEvent) => setSpin(Math.round((pointer.clientX - origin) / 20) * 45);
          const end = () => window.removeEventListener("pointermove", move);
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", end, { once: true });
        }}
        aria-label="Spin preview"
        style={{ transform: `rotate(${spin}deg)` }}
      >
        Spin preview
      </button>
    );
  }

  if (!Scene || lost) {
    return (
      <button
        type="button"
        className="font-sans text-sm text-muted"
        onClick={() => {
          setLost(false);
          void import("@/components/motion/could/Cup3DScene").then((mod) => setScene(() => mod.default));
        }}
      >
        3D preview
      </button>
    );
  }

  return (
    <div ref={box} className="cup-preview h-64">
      <Scene color={color} />
    </div>
  );
}
