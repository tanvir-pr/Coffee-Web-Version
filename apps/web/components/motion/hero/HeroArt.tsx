"use client";

import { useId } from "react";
import { heroWavePath } from "@/lib/motion/hero";

export function HeroArt({ pose }: { pose: "empty" | "served" }) {
  const clipId = `pour-${useId().replaceAll(":", "")}`;
  return (
    <svg className="cup hero-cup" data-pose={pose} viewBox="0 0 220 300" aria-hidden="true">
      <defs>
        <linearGradient id={`${clipId}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#2B1A12" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id={`${clipId}-foam`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF9F2" />
          <stop offset="55%" stopColor="#E8C49A" />
          <stop offset="100%" stopColor="#C98B4F" />
        </radialGradient>
        <linearGradient id={`${clipId}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6F9B55" />
          <stop offset="100%" stopColor="#3F6A32" />
        </linearGradient>
      </defs>

      <g className="hero-tree" opacity="0.55">
        <path d="M28 248 C30 210 24 180 34 150 C40 170 48 168 46 148 C58 176 66 170 62 150 C74 182 70 210 72 248 Z" fill={`url(#${clipId}-leaf)`} />
        <path d="M48 248 C49 228 46 210 52 194" fill="none" stroke="#4A3224" strokeWidth="2.2" strokeLinecap="round" />
        <circle className="hero-cherry" cx="36" cy="164" r="3.2" fill="#9E2F63" />
        <circle className="hero-cherry" cx="58" cy="156" r="2.6" fill="#9E2F63" opacity="0.85" />
        <circle className="hero-cherry" cx="46" cy="178" r="2.2" fill="#7A244C" />
      </g>

      <g className="hero-beans" fill="#2B1A12">
        <ellipse className="hero-bean" cx="168" cy="92" rx="7" ry="4.5" transform="rotate(-28 168 92)" opacity="0.55" />
        <ellipse className="hero-bean" cx="186" cy="118" rx="6" ry="3.8" transform="rotate(18 186 118)" opacity="0.4" />
        <ellipse className="hero-bean" cx="174" cy="146" rx="6.5" ry="4" transform="rotate(-8 174 146)" opacity="0.48" />
        <path d="M164 92 C168 90 172 94 168 96" fill="none" stroke="#F3EBDD" strokeWidth="0.7" opacity="0.35" />
      </g>

      <g fill="#2B1A12">
        <rect x="88" y="34" width="44" height="11" rx="3" />
        <path d="M96 45h8v30h-8zM116 45h8v30h-8z" />
      </g>
      <rect className="stream" x="97" y="75" width="5" height="52" rx="2" fill="#2B1A12" />
      <rect className="stream" x="118" y="75" width="5" height="52" rx="2" fill="#2B1A12" />
      <circle className="drip" cx="110" cy="130" r="3.5" fill="#2B1A12" />

      <ellipse cx="110" cy="262" rx="42" ry="7" fill="currentColor" opacity="0.08" />

      <path
        d="M68 134h84c4 52-8 108-42 118-34-10-46-66-42-118z"
        fill={`url(#${clipId}-glass)`}
        opacity="0.35"
      />
      <path
        d="M78 142 C84 170 84 220 80 246"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      <clipPath id={clipId}>
        <path d="M72 138h76c3 46-6 96-38 104-32-8-41-58-38-104z" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <g transform="translate(50 174)">
          <g className="liquid">
            <g className="liquid-tilt">
              <path className="wave" fill="#3B2217" d={heroWavePath(0, 0)} />
              <ellipse className="pour-ripple" cx="60" cy="4" rx="34" ry="5" fill="none" stroke="#5A3A28" strokeOpacity="0.35" />
              <ellipse className="pour-ripple" cx="60" cy="4" rx="22" ry="3.2" fill="none" stroke="#7A5340" strokeOpacity="0.25" />
              <rect className="crema" x="0" y="-12" width="120" height="18" fill={`url(#${clipId}-foam)`} />
              <circle className="crema-bubble" cx="28" cy="-4" r="1.6" fill="#FFF8F0" opacity="0.55" />
              <circle className="crema-bubble" cx="48" cy="-6" r="1.1" fill="#FFF8F0" opacity="0.45" />
              <circle className="crema-bubble" cx="74" cy="-3" r="1.4" fill="#FFF8F0" opacity="0.5" />
              <circle className="crema-bubble" cx="92" cy="-5" r="0.9" fill="#FFF8F0" opacity="0.4" />
              <path
                className="art-path"
                d="M60 0C48 -10 34 -2 60 18C86 -2 72 -10 60 0Z"
                fill="none"
                stroke="#F7F1E8"
                strokeWidth="1.7"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
              />
            </g>
          </g>
        </g>
      </g>

      <path
        d="M68 134h84c4 52-8 108-42 118-34-10-46-66-42-118z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.55"
      />
      <path d="M152 174c18 4 24 22 16 36" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="110" cy="134" rx="42" ry="7" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />
      <ellipse cx="110" cy="133" rx="34" ry="4" fill="#ffffff" fillOpacity="0.12" />

      <g className="steam">
        <path className="steam-wisp" d="M88 124C94 104 82 98 90 78" />
        <path className="steam-wisp" d="M110 118C118 94 100 88 112 68" />
        <path className="steam-wisp" d="M132 124C140 102 124 96 134 80" />
      </g>
    </svg>
  );
}
