import type { MotionTier } from "@/lib/motion/tier";

export function revealDuration(tier: MotionTier): number {
  if (tier === "static") return 0;
  if (tier === "lite") return 0.28;
  return 0.55;
}

export function revealY(tier: MotionTier): number {
  if (tier === "static") return 0;
  if (tier === "lite") return 12;
  return 28;
}

export function staggerGap(tier: MotionTier): number {
  if (tier === "static") return 0;
  if (tier === "lite") return 0.04;
  return 0.07;
}

export const DAYPART_COPY: Record<"morning" | "afternoon" | "night", { title: string; line: string }> = {
  morning: {
    title: "Morning Brew",
    line: "Bright cups for the first light. Espresso short, oat steamed soft.",
  },
  afternoon: {
    title: "Afternoon Chill",
    line: "Matcha, cold brew, and a slower pour between errands.",
  },
  night: {
    title: "Night Decaf",
    line: "Low caffeine, warm foam, last call without the buzz.",
  },
};
