"use client";

import { useId } from "react";
import { heroWavePath } from "@/lib/motion/hero";

export function HeroArt({ pose }: { pose: "empty" | "served" }) {
  const clipId = `pour-${useId().replaceAll(":", "")}`;
  return (
    <svg className="cup" data-pose={pose} viewBox="0 0 200 280" aria-hidden="true">
      <g fill="#2B1A12">
        <rect x="78" y="36" width="44" height="10" rx="3" />
        <path d="M86 46h8v28h-8zM106 46h8v28h-8z" />
      </g>
      <rect className="stream" x="87" y="74" width="5" height="48" rx="2" fill="#2B1A12" />
      <rect className="stream" x="108" y="74" width="5" height="48" rx="2" fill="#2B1A12" />
      <circle className="drip" cx="100" cy="126" r="3.5" fill="#2B1A12" />
      <clipPath id={clipId}>
        <path d="M62 132h76c3 46-6 96-38 104-32-8-41-58-38-104z" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <g transform="translate(40 168)">
          <g className="liquid">
            <path className="wave" fill="#3B2217" d={heroWavePath(0, 0)} />
            <rect className="crema" x="0" y="-10" width="120" height="16" fill="#C98B4F" />
            <path
              className="art-path"
              d="M60 2C50 -6 38 0 60 16C82 0 70 -6 60 2Z"
              fill="none"
              stroke="#F3EBDD"
              strokeWidth="1.6"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
            />
          </g>
        </g>
      </g>
      <path
        d="M58 128h84c4 52-8 108-42 118-34-10-46-66-42-118z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.55"
      />
      <path d="M142 168c18 4 24 22 16 36" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g className="steam">
        <path className="steam-wisp" d="M78 118C84 100 72 94 80 76" />
        <path className="steam-wisp" d="M100 112C108 90 92 84 102 66" />
        <path className="steam-wisp" d="M122 118C130 98 116 92 124 78" />
      </g>
    </svg>
  );
}
