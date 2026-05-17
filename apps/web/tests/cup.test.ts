import { describe, expect, it } from "vitest";
import { drinkFor } from "@/lib/cup/drinks";
import {
  CUP,
  buildLayers,
  impulse,
  layoutLayers,
  reduceRecipe,
  stepSpring,
  wavePath,
  type Recipe,
} from "@/lib/cup/recipe";

const recipe: Recipe = {
  drink: "matcha-latte",
  size: "M",
  milk: "oat",
  temp: "hot",
  sugar: 0,
  shots: 1,
  syrups: [],
  foam: true,
  art: "leaf",
};

describe("live cup recipe", () => {
  it("keeps the latest recipe after ten rapid changes", () => {
    const patches = ["S", "M", "L", "S", "M", "L", "S", "M", "L", "S"].map((size) => ({
      size: size as Recipe["size"],
    }));
    expect(reduceRecipe(recipe, patches).size).toBe("S");
  });

  it("keeps layer heights within 2% of their volume share", () => {
    const drink = drinkFor("matcha-latte");
    for (const size of ["S", "M", "L"] as const) {
      const layers = buildLayers({ ...recipe, size }, drink);
      const placed = layoutLayers(layers, { ...recipe, size }, drink);
      const total = layers.reduce((sum, layer) => sum + layer.volume, 0);
      for (const layer of placed) {
        expect(Math.abs(layer.height / CUP.height - layer.volume / total)).toBeLessThan(0.02);
      }
    }
  });

  it("retints the base when the milk changes", () => {
    const drink = drinkFor("matcha-latte");
    const oat = layoutLayers(buildLayers(recipe, drink), recipe, drink).find((layer) => layer.id === "base");
    const whole = layoutLayers(
      buildLayers({ ...recipe, milk: "whole" }, drink),
      { ...recipe, milk: "whole" },
      drink,
    ).find((layer) => layer.id === "base");
    expect(oat?.fill).toBe("#C8DDA8");
    expect(whole?.fill).not.toBe(oat?.fill);
    expect(whole?.fill).toContain("#F3EBDD");
  });

  it("settles the surface spring inside 1.2s and clamps the wave", () => {
    const state = { y: 0, v: 0 };
    impulse(state, 240);
    expect(Math.abs(state.v)).toBeGreaterThan(0);
    for (let elapsed = 0; elapsed < 1200; elapsed += 16) stepSpring(state, 16);
    expect(Math.abs(state.y)).toBeLessThanOrEqual(6);
    expect(Math.abs(state.y)).toBeLessThan(0.5);
    expect(wavePath(0, 120, 40, 140, state.y)).toContain("40.00");
  });
});
