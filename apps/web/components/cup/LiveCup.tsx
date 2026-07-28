"use client";

import { m } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { drinkFor } from "@/lib/cup/drinks";
import {
  CUP,
  SYRUP_COLOR,
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
  heart: "M60 52 C52 42 40 48 60 66 C80 48 68 42 60 52 Z",
  leaf: "M48 62 C58 44 78 46 74 64 C64 58 54 66 48 62 Z",
  rosetta: "M44 64 C52 48 68 48 76 64 C70 58 62 54 60 66 C58 54 50 58 44 64 Z",
};

const FOAM_BUBBLES = [
  { x: 0.18, y: 0.35, r: 1.8 },
  { x: 0.32, y: 0.55, r: 1.15 },
  { x: 0.48, y: 0.28, r: 2.2 },
  { x: 0.62, y: 0.5, r: 1.35 },
  { x: 0.74, y: 0.32, r: 1.7 },
  { x: 0.28, y: 0.78, r: 0.9 },
  { x: 0.55, y: 0.72, r: 1.05 },
  { x: 0.7, y: 0.7, r: 0.85 },
  { x: 0.4, y: 0.42, r: 0.7 },
  { x: 0.82, y: 0.48, r: 1.1 },
];

function paint(svg: SVGSVGElement | null, offset: number, phase = 0) {
  svg?.querySelectorAll<SVGPathElement>("[data-liquid]").forEach((node) => {
    const left = Number(node.dataset.left);
    const width = Number(node.dataset.width);
    const top = Number(node.dataset.top);
    const bottom = Number(node.dataset.bottom);
    const damp = node.dataset.foam === "1" ? 0.35 : 1;
    node.setAttribute("d", wavePath(left, width, top, bottom, offset * damp, phase));
  });
  const meniscus = svg?.querySelector<SVGPathElement>("[data-meniscus]");
  if (meniscus) {
    const top = Number(meniscus.dataset.top ?? 40);
    meniscus.setAttribute("d", wavePath(CUP.left, CUP.width, top, top + 3.2, offset * 0.55, phase));
  }
  const foamCap = svg?.querySelector<SVGEllipseElement>("[data-foam-cap]");
  if (foamCap) {
    const top = Number(foamCap.dataset.top ?? 40);
    foamCap.setAttribute("cy", (top + 2.2 + offset * 0.25).toFixed(2));
  }
}

export function LiveCup({ recipe, className = "live-cup h-64 w-full text-foreground" }: { recipe: Recipe; className?: string }) {
  const tier = useTier();
  const uid = useId().replaceAll(":", "");
  const clipId = `cup-${uid}`;
  const glassGrad = `glass-${uid}`;
  const liquidGrad = `liquid-${uid}`;
  const shineGrad = `shine-${uid}`;
  const foamGrad = `foam-${uid}`;
  const softId = `soft-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const springRef = useRef<SpringState>({ y: 0, v: 0 });
  const volumeRef = useRef<number | null>(null);
  const drink = drinkFor(recipe.drink);
  const layers = layoutLayers(buildLayers(recipe, drink), recipe, drink);
  const foamLayer = layers.find((layer) => layer.id === "foam");
  const iceCount = recipe.temp === "iced" ? (tier === "lite" ? 3 : 5) : 0;
  const volume = layers.reduce((sum, layer) => sum + layer.volume, 0);
  const surfaceTop = layers.at(-1)?.top ?? 40;
  const foamTop = foamLayer?.top ?? surfaceTop;
  const syrupColor = recipe.syrups[0] ? SYRUP_COLOR[recipe.syrups[0]] : "#D98A3D";
  const motion = tier === "full";

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
      paint(svg, 0, 0);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      stepSpring(springRef.current, now - last);
      last = now;
      const phase = now / 920;
      const idle = Math.sin(phase) * 0.42 + Math.sin(phase * 1.7) * 0.18;
      paint(svg, springRef.current.y + idle, phase);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      paint(svg, 0, 0);
    };
  }, [tier]);

  return (
    <m.svg
      ref={svgRef}
      viewBox="0 0 120 160"
      role="img"
      aria-hidden
      data-motion={tier}
      className={`${className} live-cup-glass`}
      animate={{ scale: SCALE[recipe.size] }}
      transition={tier === "full" ? spring.bouncy : { duration: tier === "lite" ? 0.3 : 0 }}
      style={{ originX: "50%", originY: "72%" }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M22 34 H98 C102 34 104 38 103 44 L96 132 C95 138 90 142 84 142 H36 C30 142 25 138 24 132 L17 44 C16 38 18 34 22 34 Z" />
        </clipPath>
        <linearGradient id={glassGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="72%" stopColor="#2b1a12" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={liquidGrad} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="18%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={shineGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={foamGrad} cx="42%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FFFCFA" />
          <stop offset="45%" stopColor="#F6EFE6" />
          <stop offset="100%" stopColor="#E7D8C6" />
        </radialGradient>
        <filter id={softId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.55" />
        </filter>
      </defs>

      <ellipse cx="60" cy="148" rx="34" ry="5" fill="currentColor" fillOpacity="0.08" />

      <path
        d="M20 36 H100 C105 36 107 41 106 47 L98 134 C97 141 91 146 84 146 H36 C29 146 23 141 22 134 L14 47 C13 41 15 36 20 36 Z"
        fill={`url(#${glassGrad})`}
        fillOpacity="0.22"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.2"
      />
      <path
        className={motion ? "cup-glass-sheen" : undefined}
        d="M28 40 C34 52 34 110 30 138"
        fill="none"
        stroke={`url(#${shineGrad})`}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M90 42 C86 58 87 112 91 136"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <g clipPath={`url(#${clipId})`} data-liquid-group="">
        {layers.map((layer) => (
          <path
            key={layer.id}
            data-liquid=""
            data-foam={layer.id === "foam" ? "1" : "0"}
            data-left={CUP.left}
            data-width={CUP.width}
            data-top={layer.top}
            data-bottom={layer.bottom}
            d={wavePath(CUP.left, CUP.width, layer.top, layer.bottom, 0)}
            fill={layer.id === "foam" ? `url(#${foamGrad})` : layer.fill}
            className={layer.id === "foam" && motion ? "cup-foam-rise" : undefined}
            style={{
              transition: tier === "static" ? "none" : `fill ${tier === "lite" ? 320 : 700}ms ease`,
            }}
          />
        ))}
        <rect x="18" y="32" width="84" height="112" fill={`url(#${liquidGrad})`} pointerEvents="none" />
        <path
          data-meniscus=""
          data-top={surfaceTop}
          d={wavePath(CUP.left, CUP.width, surfaceTop, surfaceTop + 3.2, 0)}
          fill="#ffffff"
          fillOpacity="0.16"
          filter={`url(#${softId})`}
        />

        {recipe.foam ? (
          <g className={tier !== "static" ? "cup-foam-shell" : undefined} key={`foam-${recipe.art}`}>
            <ellipse
              data-foam-cap=""
              data-top={foamTop}
              cx="60"
              cy={foamTop + 1.4}
              rx="38"
              ry="9.5"
              fill={`url(#${foamGrad})`}
              opacity="0.98"
              filter={`url(#${softId})`}
            />
            <path
              d={`M${CUP.left + 4} ${foamTop + 4} Q60 ${foamTop - 4} ${CUP.left + CUP.width - 4} ${foamTop + 4}`}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.35"
              strokeWidth="1.4"
            />
            <ellipse cx="46" cy={foamTop + 0.8} rx="12" ry="3.8" fill="#ffffff" fillOpacity="0.42" />
            <ellipse cx="72" cy={foamTop + 2.4} rx="8" ry="2.6" fill="#ffffff" fillOpacity="0.22" />
            {FOAM_BUBBLES.slice(0, tier === "static" ? 4 : 10).map((bubble, index) => (
              <circle
                key={`fb-${index}`}
                className={tier !== "static" ? "cup-move cup-foam-bubble" : "cup-move"}
                cx={CUP.left + CUP.width * bubble.x}
                cy={foamTop + 1.5 + bubble.y * 10}
                r={bubble.r * 1.15}
                fill="#FFFCFA"
                fillOpacity={0.4 + (index % 3) * 0.14}
                style={{ animationDelay: `${index * 0.14}s` }}
              />
            ))}
            {recipe.art !== "none" ? (
              <path
                className={tier !== "static" ? "cup-latte-art" : undefined}
                d={ART[recipe.art]}
                fill="none"
                stroke="#FBF6EF"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
                transform={`translate(0 ${foamTop - 46})`}
              />
            ) : null}
          </g>
        ) : null}

        {Array.from({ length: iceCount }, (_, index) => (
          <g
            key={`ice-${index}`}
            className={motion ? "cup-move cup-bob" : "cup-move"}
            style={{ animationDelay: `${index * 0.12}s` }}
          >
            <path
              d={`M${30 + (index % 3) * 22} ${50 + (index % 2) * 14} l8 -3 7 5 -2 8 -9 2 -6 -5 z`}
              fill="#EAF5FF"
              fillOpacity="0.78"
              stroke="#ffffff"
              strokeOpacity="0.45"
              strokeWidth="0.7"
            />
            <path
              d={`M${33 + (index % 3) * 22} ${51 + (index % 2) * 14} l6 0`}
              stroke="#ffffff"
              strokeOpacity="0.65"
              strokeWidth="1"
            />
          </g>
        ))}

        {recipe.sugar > 0
          ? Array.from({ length: recipe.sugar }, (_, index) => (
              <g
                key={`sugar-${recipe.sugar}-${index}`}
                className={motion ? "cup-move cup-sugar" : "cup-move"}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <rect
                  x={40 + index * 9}
                  y={72 + (index % 2) * 4}
                  width="7"
                  height="7"
                  rx="1.4"
                  transform={`rotate(${12 + index * 8} ${43.5 + index * 9} ${75.5 + (index % 2) * 4})`}
                  fill="#F7F4EE"
                  stroke="#E8D9C4"
                  strokeWidth="0.5"
                />
              </g>
            ))
          : null}

        {recipe.syrups.length > 0 ? (
          <g key={recipe.syrups.join("-")} className={motion ? "cup-syrup-group" : undefined}>
            <path
              className={motion ? "cup-move cup-drizzle" : "cup-move"}
              d="M76 38 C80 58 72 78 78 102 C80 112 76 122 74 132"
              fill="none"
              stroke={syrupColor}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              className={motion ? "cup-move cup-drizzle" : "cup-move"}
              d="M68 40 C66 62 74 84 70 110"
              fill="none"
              stroke={syrupColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
              style={{ animationDelay: "0.12s" }}
            />
            {[0, 1, 2].map((index) => (
              <circle
                key={`drop-${index}`}
                className={motion ? "cup-move cup-syrup-drop" : "cup-move"}
                cx={74 + index * 3}
                cy={46 + index * 18}
                r={1.4 - index * 0.2}
                fill={syrupColor}
                style={{ animationDelay: `${0.18 + index * 0.1}s` }}
              />
            ))}
          </g>
        ) : null}
      </g>

      <ellipse cx="60" cy="34" rx="44" ry="7.5" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" />
      <ellipse cx="60" cy="33.2" rx="38" ry="4.2" fill="#ffffff" fillOpacity="0.12" />
      <path
        d="M24 40 C28 36 92 36 96 40"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {recipe.temp === "hot" && tier !== "static" ? (
        <g className="cup-move cup-steam" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round">
          <path className="cup-steam-wisp" d="M46 26 C42 18 50 14 46 6 C44 2 48 0 50 2" />
          <path className="cup-steam-wisp" d="M60 24 C64 16 56 12 60 5 C62 1 58 0 57 3" style={{ animationDelay: "0.35s" }} />
          <path className="cup-steam-wisp" d="M74 27 C78 19 70 15 74 7 C76 3 72 1 71 4" style={{ animationDelay: "0.7s" }} />
        </g>
      ) : null}
    </m.svg>
  );
}
