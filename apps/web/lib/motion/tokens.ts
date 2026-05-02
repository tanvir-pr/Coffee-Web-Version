export const dur = {
  instant: 0.1,
  fast: 0.16,
  base: 0.24,
  medium: 0.32,
  slow: 0.48,
  slower: 0.7,
} as const;

export const ease = {
  standard: [0.2, 0, 0, 1],
  outQuart: [0.25, 1, 0.5, 1],
  outExpo: [0.16, 1, 0.3, 1],
  pour: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  snappy: { type: "spring" as const, stiffness: 420, damping: 34 },
  gentle: { type: "spring" as const, stiffness: 220, damping: 26 },
  bouncy: { type: "spring" as const, stiffness: 300, damping: 18 },
  liquid: { type: "spring" as const, stiffness: 160, damping: 9, mass: 0.8 },
} as const;
