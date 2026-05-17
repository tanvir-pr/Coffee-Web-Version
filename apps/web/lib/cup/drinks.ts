import type { DrinkProfile } from "@/lib/cup/recipe";

const MATCHA: DrinkProfile = {
  base: "#6E9E48",
  blended: "#C8DDA8",
  ratio: 0.42,
  milk: "oat",
  temp: "hot",
  foam: true,
  art: "leaf",
};

export const DRINKS: Record<string, DrinkProfile> = {
  "oat-flat-white": {
    base: "#3B2217",
    blended: "#C99467",
    ratio: 0.35,
    milk: "oat",
    temp: "hot",
    foam: true,
    art: "heart",
  },
  espresso: {
    base: "#2B1A12",
    blended: "#3B2217",
    ratio: 0.85,
    milk: "none",
    temp: "hot",
    foam: false,
    art: "none",
    shots: 2,
  },
  "decaf-americano": {
    base: "#3B2217",
    blended: "#6B4A38",
    ratio: 0.28,
    milk: "none",
    temp: "hot",
    foam: false,
    art: "none",
  },
  "berry-cold-brew": {
    base: "#4A2A1A",
    blended: "#B4457A",
    ratio: 0.72,
    milk: "none",
    temp: "iced",
    foam: false,
    art: "none",
    syrups: ["berry"],
  },
  "nitro-cold-brew": {
    base: "#2B1A12",
    blended: "#E8DCCB",
    ratio: 0.8,
    milk: "none",
    temp: "iced",
    foam: true,
    art: "none",
  },
  "iced-matcha": { ...MATCHA, temp: "iced", foam: false, art: "none" },
  "matcha-latte": MATCHA,
  "decaf-chai": {
    base: "#A0612F",
    blended: "#E2B98C",
    ratio: 0.4,
    milk: "oat",
    temp: "hot",
    foam: false,
    art: "none",
  },
  "pumpkin-oat-latte": {
    base: "#C46A2A",
    blended: "#E2B98C",
    ratio: 0.4,
    milk: "oat",
    temp: "hot",
    foam: true,
    art: "leaf",
  },
  "night-mocha": {
    base: "#4E2A1E",
    blended: "#7A4A35",
    ratio: 0.55,
    milk: "whole",
    temp: "hot",
    foam: true,
    art: "heart",
  },
};

const FALLBACK: DrinkProfile = {
  base: "#3B2217",
  blended: "#C99467",
  ratio: 0.4,
  milk: "oat",
  temp: "hot",
  foam: true,
  art: "none",
};

export function drinkFor(slug: string): DrinkProfile {
  return DRINKS[slug] ?? FALLBACK;
}
