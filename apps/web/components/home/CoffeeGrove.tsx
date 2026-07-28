"use client";

import { useTier } from "@/app/providers/MotionProvider";
import { AirflowField } from "@/components/motion/could/Airflow";

export function CoffeeGrove() {
  const tier = useTier();
  return (
    <div className="coffee-grove" data-motion={tier} aria-hidden="true">
      <AirflowField className="coffee-grove-air" intro="soft" />
      <svg className="coffee-grove-svg" viewBox="0 0 760 360" role="presentation">
        <defs>
          <linearGradient id="grove-leaf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8DBF6A" />
            <stop offset="100%" stopColor="#4F7A3A" />
          </linearGradient>
          <linearGradient id="grove-leaf-deep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6FA352" />
            <stop offset="100%" stopColor="#3A5F2C" />
          </linearGradient>
          <linearGradient id="grove-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3A2418" />
            <stop offset="50%" stopColor="#6A4330" />
            <stop offset="100%" stopColor="#2B1A12" />
          </linearGradient>
          <radialGradient id="grove-glow" cx="50%" cy="70%" r="55%">
            <stop offset="0%" stopColor="#D98A3D" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#D98A3D" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="grove-cup-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2B1A12" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="grove-drink" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#E8C49A" />
            <stop offset="45%" stopColor="#8B5A34" />
            <stop offset="100%" stopColor="#3B2217" />
          </linearGradient>
          <linearGradient id="grove-pour-stream" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#5C3824" stopOpacity="0.15" />
            <stop offset="40%" stopColor="#3B2217" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3B2217" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <ellipse cx="380" cy="318" rx="300" ry="34" fill="url(#grove-glow)" />
        <path
          d="M40 318 C160 298 280 328 380 310 C500 288 620 322 720 308 L720 340 L40 340 Z"
          fill="currentColor"
          opacity="0.06"
        />

        <g className="grove-tree grove-tree-a">
          <path
            d="M108 310 C110 230 92 160 120 96 C134 136 160 128 150 84 C176 140 200 128 186 90 C218 156 206 228 212 310 Z"
            fill="url(#grove-leaf)"
          />
          <path
            d="M148 310 C150 250 142 190 158 140"
            fill="none"
            stroke="url(#grove-trunk)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <ellipse className="grove-leaf-flutter" cx="132" cy="150" rx="10" ry="5" fill="#6FA352" opacity="0.55" transform="rotate(-28 132 150)" />
          <ellipse className="grove-leaf-flutter" cx="174" cy="138" rx="9" ry="4.5" fill="#8DBF6A" opacity="0.5" transform="rotate(18 174 138)" style={{ animationDelay: "0.5s" }} />
          <circle className="grove-cherry" cx="128" cy="124" r="5.2" fill="#9E2F63" />
          <circle className="grove-cherry" cx="160" cy="108" r="4.4" fill="#B4457A" />
          <circle className="grove-cherry" cx="144" cy="156" r="3.8" fill="#7A244C" />
          <circle className="grove-fall" cx="136" cy="134" r="3.2" fill="#9E2F63" />
          <circle className="grove-fall" cx="168" cy="120" r="2.6" fill="#B4457A" style={{ animationDelay: "1.6s" }} />
        </g>

        <g className="grove-tree grove-tree-b">
          <path
            d="M286 310 C294 206 268 124 304 58 C320 112 356 100 342 50 C374 116 410 98 390 56 C430 138 410 214 418 310 Z"
            fill="url(#grove-leaf-deep)"
          />
          <path
            d="M348 310 C354 240 342 168 360 108"
            fill="none"
            stroke="url(#grove-trunk)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <ellipse className="grove-leaf-flutter" cx="318" cy="130" rx="12" ry="5.5" fill="#8DBF6A" opacity="0.45" transform="rotate(-12 318 130)" style={{ animationDelay: "0.9s" }} />
          <ellipse className="grove-leaf-flutter" cx="382" cy="118" rx="11" ry="5" fill="#6FA352" opacity="0.5" transform="rotate(22 382 118)" style={{ animationDelay: "0.2s" }} />
          <circle className="grove-cherry" cx="320" cy="88" r="6" fill="#9E2F63" />
          <circle className="grove-cherry" cx="360" cy="72" r="5" fill="#B4457A" />
          <circle className="grove-cherry" cx="340" cy="122" r="4.4" fill="#7A244C" />
          <circle className="grove-cherry" cx="378" cy="110" r="3.8" fill="#9E2F63" />
          <circle className="grove-fall" cx="334" cy="96" r="3.5" fill="#B4457A" />
          <circle className="grove-fall" cx="366" cy="90" r="2.9" fill="#9E2F63" style={{ animationDelay: "1.1s" }} />
          <circle className="grove-fall" cx="352" cy="112" r="2.4" fill="#7A244C" style={{ animationDelay: "2.3s" }} />
        </g>

        <g className="grove-tree grove-tree-c">
          <path
            d="M500 310 C508 230 484 160 514 100 C528 140 556 132 544 94 C570 146 592 136 578 102 C606 160 594 230 600 310 Z"
            fill="url(#grove-leaf)"
          />
          <path
            d="M544 310 C550 252 540 196 556 148"
            fill="none"
            stroke="url(#grove-trunk)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <ellipse className="grove-leaf-flutter" cx="528" cy="156" rx="9" ry="4.5" fill="#8DBF6A" opacity="0.5" transform="rotate(-20 528 156)" style={{ animationDelay: "1.2s" }} />
          <circle className="grove-cherry" cx="522" cy="122" r="5" fill="#9E2F63" />
          <circle className="grove-cherry" cx="556" cy="110" r="4.2" fill="#B4457A" />
          <circle className="grove-cherry" cx="538" cy="148" r="3.6" fill="#7A244C" />
          <circle className="grove-fall" cx="532" cy="118" r="3" fill="#7A244C" style={{ animationDelay: "0.6s" }} />
          <circle className="grove-fall" cx="560" cy="126" r="2.5" fill="#B4457A" style={{ animationDelay: "2s" }} />
        </g>

        <g className="grove-pour-line">
          <path
            className="grove-pour-stream"
            d="M648 48 C648 70 648 96 648 118"
            fill="none"
            stroke="url(#grove-pour-stream)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <ellipse className="grove-pour-drop" cx="648" cy="44" rx="2.4" ry="3.4" fill="#3B2217" />
          <ellipse className="grove-pour-drop" cx="648" cy="58" rx="1.8" ry="2.6" fill="#5C3824" style={{ animationDelay: "0.7s" }} />
        </g>

        <g className="grove-cup" transform="translate(600 148)">
          <ellipse cx="48" cy="128" rx="30" ry="5.5" fill="currentColor" opacity="0.12" />
          <path
            d="M16 30 H80 C84 30 86 34 85 40 L78 116 C77 122 72 126 66 126 H30 C24 126 19 122 18 116 L11 40 C10 34 12 30 16 30 Z"
            fill="url(#grove-cup-glass)"
            stroke="currentColor"
            strokeOpacity="0.38"
            strokeWidth="1.6"
          />
          <path
            d="M20 48 H76 L72 112 C71 116 68 118 64 118 H32 C28 118 25 116 24 112 Z"
            fill="url(#grove-drink)"
          />
          <ellipse cx="48" cy="48" rx="28" ry="5.5" fill="#F4EDE4" opacity="0.92" />
          <path d="M28 48 C36 44 44 52 48 48 C52 44 60 52 68 48" fill="none" stroke="#E8C49A" strokeWidth="1.2" opacity="0.7" />
          <circle className="grove-cup-bubble" cx="34" cy="50" r="1.4" fill="#FFFCFA" opacity="0.55" />
          <circle className="grove-cup-bubble" cx="52" cy="49" r="1.1" fill="#FFFCFA" opacity="0.45" style={{ animationDelay: "0.5s" }} />
          <circle className="grove-cup-bubble" cx="62" cy="51" r="0.9" fill="#FFFCFA" opacity="0.4" style={{ animationDelay: "1.1s" }} />
          <path
            d="M84 62 C100 66 102 90 88 98"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.48"
          />
          <g className="grove-cup-steam" fill="none" stroke="currentColor" strokeOpacity="0.42" strokeWidth="1.4" strokeLinecap="round">
            <path className="grove-steam-wisp" d="M34 26 C30 14 38 10 34 0" />
            <path className="grove-steam-wisp" d="M48 24 C52 12 44 8 50 -2" style={{ animationDelay: "0.4s" }} />
            <path className="grove-steam-wisp" d="M62 26 C66 14 58 10 62 0" style={{ animationDelay: "0.8s" }} />
          </g>
        </g>

        <g className="grove-beans" fill="#2B1A12">
          <ellipse className="grove-bean" cx="236" cy="268" rx="11" ry="6.5" transform="rotate(-24 236 268)" opacity="0.5" />
          <ellipse className="grove-bean" cx="440" cy="278" rx="10" ry="6" transform="rotate(16 440 278)" opacity="0.42" />
          <ellipse className="grove-bean" cx="290" cy="286" rx="8.5" ry="5.2" transform="rotate(-8 290 286)" opacity="0.36" />
          <ellipse className="grove-bean grove-bean-fly" cx="206" cy="198" rx="7.5" ry="4.4" transform="rotate(12 206 198)" opacity="0.44" />
          <ellipse className="grove-bean grove-bean-fly" cx="476" cy="186" rx="7" ry="4.2" transform="rotate(-18 476 186)" opacity="0.4" style={{ animationDelay: "1.4s" }} />
          <ellipse className="grove-bean grove-bean-fly" cx="250" cy="160" rx="6" ry="3.6" transform="rotate(8 250 160)" opacity="0.34" style={{ animationDelay: "2.2s" }} />
        </g>
      </svg>
    </div>
  );
}
