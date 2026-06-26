"use client";

import { m } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { drinkFor } from "@/lib/cup/drinks";
import {
  CUP,
  buildLayers,
  impulse,
  layoutLayers,
  stepSpring,
  wavePath,
  type Recipe,
  type SpringState,
} from "@/lib/cup/recipe";
import { useTier } from "@/app/providers/MotionProvider";
import { spring } from "@/lib/motion/tokens";

const SCALE = { S: 0.86, M: 1, L: 1.14 } as const;
const ART: Record<Exclude<Recipe["art"], "none">, string> = {
  heart: "M60 48 C54 40 44 46 60 58 C76 46 66 40 60 48 Z",
  leaf: "M48 58 C62 40 78 48 70 62 C60 56 52 62 48 58 Z",
  rosetta: "M46 60 C54 46 66 46 74 60 C66 54 54 54 46 60 Z",
};

function paint(svg: SVGSVGElement | null, offset: number) {
  svg?.querySelectorAll<SVGPathElement>("[data-liquid]").forEach((node) => {
    const left = Number(node.dataset.left);
    const width = Number(node.dataset.width);
    const top = Number(node.dataset.top);
    const bottom = Number(node.dataset.bottom);
    node.setAttribute("d", wavePath(left, width, top, bottom, offset));
  });
}

export function LiveCup({ recipe }: { recipe: Recipe }) {
  const tier = useTier();
  const clipId = `cup-${useId().replaceAll(":", "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const springRef = useRef<SpringState>({ y: 0, v: 0 });
  const volumeRef = useRef<number | null>(null);
  const drink = drinkFor(recipe.drink);
  const layers = layoutLayers(buildLayers(recipe, drink), recipe, drink);
  const iceCount = recipe.temp === "iced" ? (tier === "lite" ? 3 : 4) : 0;
  const volume = layers.reduce((sum, layer) => sum + layer.volume, 0);

  useEffect(() => {
    if (volumeRef.current === null) {
      volumeRef.current = volume;
      return;
    }
    if (tier === "full") impulse(springRef.current, volume - volumeRef.current);
    volumeRef.current = volume;
  }, [volume, tier]);

  useEffect(() => {
    const svg = svgRef.current;
    if (tier !== "full") {
      paint(svg, 0);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      stepSpring(springRef.current, now - last);
      last = now;
      paint(svg, springRef.current.y);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      paint(svg, 0);
    };
  }, [tier]);

  return (
    <m.svg
      ref={svgRef}
      viewBox="0 0 120 160"
      role="img"
      aria-hidden
      data-motion={tier}
      className="live-cup h-64 w-full text-foreground"
      animate={{ scale: SCALE[recipe.size] }}
      transition={tier === "full" ? spring.bouncy : { duration: tier === "lite" ? 0.3 : 0 }}
      style={{ originX: "50%", originY: "72%" }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="18" y="32" width="84" height="112" rx="14" />
        </clipPath>
      </defs>
      <rect x="14" y="28" width="92" height="120" rx="18" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <g clipPath={`url(#${clipId})`} data-liquid-group="">
        {layers.map((layer) => (
          <path
            key={layer.id}
            data-liquid=""
            data-left={CUP.left}
            data-width={CUP.width}
            data-top={layer.top}
            data-bottom={layer.bottom}
            d={wavePath(CUP.left, CUP.width, layer.top, layer.bottom, 0)}
            fill={layer.fill}
            style={{ transition: tier === "static" ? "none" : `fill ${tier === "lite" ? 300 : 600}ms linear` }}
          />
        ))}
        {Array.from({ length: iceCount }, (_, index) => (
          <rect
            key={index}
            className={tier === "full" ? "cup-move cup-bob" : "cup-move"}
            x={28 + (index % 3) * 22}
            y={48 + (index % 2) * 14}
            width="16"
            height="12"
            rx="3"
            fill="#F7FBFF"
            fillOpacity="0.85"
          />
        ))}
        {recipe.sugar > 0 ? (
          <rect
            key={recipe.sugar}
            className={tier === "full" ? "cup-move cup-drop" : "cup-move"}
            x={36 + recipe.sugar * 8}
            y="78"
            width="10"
            height="10"
            rx="2"
            fill="#F7F4EE"
          />
        ) : null}
        {recipe.syrups.length > 0 ? (
          <path
            className={tier === "full" ? "cup-move cup-drizzle" : "cup-move"}
            d="M78 40 C82 70 70 90 74 120"
            fill="none"
            stroke={layers[0]?.fill ?? "#D98A3D"}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ) : null}
        {recipe.foam && recipe.art !== "none" ? (
          <path d={ART[recipe.art]} fill="none" stroke="#F7F1E8" strokeWidth="1.6" />
        ) : null}
      </g>
      <ellipse cx="60" cy="30" rx="46" ry="8" fill="none" stroke="currentColor" strokeOpacity="0.55" />
      {recipe.temp === "hot" && tier === "full" ? (
        <g className="cup-move cup-steam" fill="none" stroke="currentColor" strokeOpacity="0.45">
          <path d="M48 24 C46 16 52 14 50 6" />
          <path d="M64 22 C66 14 60 12 64 4" />
        </g>
      ) : null}
    </m.svg>
  );
}
