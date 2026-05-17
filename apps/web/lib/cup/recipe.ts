import type { MenuProduct } from "@/lib/menu/menu";

export const SIZES = { S: 240, M: 360, L: 480 } as const;
export const SIZE_ORDER = ["S", "M", "L"] as const;

export type Size = (typeof SIZE_ORDER)[number];
export type Milk = "whole" | "oat" | "almond" | "soy" | "coconut" | "none";
export type Temp = "hot" | "iced";
export type Art = "none" | "heart" | "leaf" | "rosetta";
export type Syrup = "vanilla" | "caramel" | "hazelnut" | "berry";

export type Recipe = {
  drink: string;
  size: Size;
  milk: Milk;
  temp: Temp;
  sugar: 0 | 1 | 2 | 3 | 4;
  shots: number;
  syrups: Syrup[];
  foam: boolean;
  art: Art;
};

export type DrinkProfile = {
  base: string;
  blended: string;
  ratio: number;
  milk: Milk;
  temp: Temp;
  foam: boolean;
  art: Art;
  shots?: number;
  syrups?: Syrup[];
};

export type Layer = {
  id: string;
  color: string;
  volume: number;
};

export type PlacedLayer = Layer & {
  top: number;
  bottom: number;
  height: number;
  fill: string;
};

export const CUP = { left: 18, width: 84, top: 36, height: 104 };

export const MILK_TINT: Record<Exclude<Milk, "none">, string> = {
  whole: "#F3EBDD",
  oat: "#E2C29C",
  almond: "#EAD9C0",
  soy: "#EFE6CF",
  coconut: "#F7F4EE",
};

export const SYRUP_COLOR: Record<Syrup, string> = {
  vanilla: "#E2C29C",
  caramel: "#D98A3D",
  hazelnut: "#A0612F",
  berry: "#B4457A",
};

const FOAM = "#F4EDE4";

export function sizesFor(product: MenuProduct): Size[] {
  const offered = SIZE_ORDER.filter((size) => Boolean(product.prices?.[size]));
  return offered.length > 0 ? offered : ["M"];
}

export function priceFor(product: MenuProduct, size: Size): string {
  return product.prices?.[size] ?? product.prices?.M ?? product.price;
}

export function initialRecipe(product: MenuProduct, drink: DrinkProfile): Recipe {
  const sizes = sizesFor(product);
  const size = sizes.includes("M") ? "M" : (sizes[0] ?? "M");
  return {
    drink: product.slug,
    size,
    milk: drink.milk,
    temp: product.tags.includes("iced") ? "iced" : drink.temp,
    sugar: 0,
    shots: drink.shots ?? 1,
    syrups: drink.syrups ?? [],
    foam: drink.foam,
    art: drink.art,
  };
}

export function reduceRecipe(recipe: Recipe, patches: Partial<Recipe>[]): Recipe {
  return patches.reduce<Recipe>((current, patch) => ({ ...current, ...patch }), recipe);
}

export function buildLayers(recipe: Recipe, drink: DrinkProfile): Layer[] {
  const volume = SIZES[recipe.size];
  const baseRatio = Math.min(0.9, Math.max(0.15, drink.ratio + (recipe.shots - 1) * 0.06));
  const layers: Layer[] = [];
  const syrup = recipe.syrups[0];
  if (syrup) layers.push({ id: "syrup", color: SYRUP_COLOR[syrup], volume: volume * 0.08 });
  layers.push({ id: "base", color: drink.base, volume: baseRatio * volume });
  if (recipe.milk !== "none") {
    layers.push({
      id: "milk",
      color: MILK_TINT[recipe.milk],
      volume: (1 - baseRatio) * volume * 0.85,
    });
  }
  if (recipe.foam) layers.push({ id: "foam", color: FOAM, volume: volume * 0.12 });
  return layers;
}

export function blendFill(base: string, tint: string, ratio = 0.35): string {
  const milk = Math.round(ratio * 100);
  return `color-mix(in oklch, ${base} ${100 - milk}%, ${tint} ${milk}%)`;
}

export function layoutLayers(layers: Layer[], recipe: Recipe, drink: DrinkProfile): PlacedLayer[] {
  const total = layers.reduce((sum, layer) => sum + layer.volume, 0) || 1;
  let cursor = CUP.top + CUP.height;
  return layers.map((layer) => {
    const height = (layer.volume / total) * CUP.height;
    const bottom = cursor;
    cursor -= height;
    return { ...layer, top: cursor, bottom, height, fill: fillFor(layer, recipe, drink) };
  });
}

function fillFor(layer: Layer, recipe: Recipe, drink: DrinkProfile): string {
  if (layer.id === "base" && recipe.milk !== "none") {
    if (recipe.milk === drink.milk) return drink.blended;
    return blendFill(drink.base, MILK_TINT[recipe.milk]);
  }
  return layer.color;
}

export function wavePath(left: number, width: number, top: number, bottom: number, offset: number): string {
  const right = left + width;
  const mid = left + width * 0.5;
  const control = left + width * 0.25;
  const crest = top - offset;
  return `M${left.toFixed(2)} ${top.toFixed(2)} Q${control.toFixed(2)} ${crest.toFixed(2)} ${mid.toFixed(2)} ${top.toFixed(2)} T${right.toFixed(2)} ${top.toFixed(2)} V${bottom.toFixed(2)} H${left.toFixed(2)} Z`;
}

export function describeRecipe(product: MenuProduct, recipe: Recipe): string {
  const size = { S: "Small", M: "Medium", L: "Large" }[recipe.size];
  const temp = product.name.toLowerCase().includes(recipe.temp) ? "" : `${recipe.temp} `;
  const milk = recipe.milk === "none" ? "no milk" : `${recipe.milk} milk`;
  const sugar = recipe.sugar === 0 ? "no sugar" : `${recipe.sugar} sugar`;
  const shots = `${recipe.shots} ${recipe.shots === 1 ? "shot" : "shots"}`;
  const syrup = recipe.syrups.length > 0 ? `${recipe.syrups.join(", ")} syrup` : "no syrup";
  const art = recipe.foam && recipe.art !== "none" ? `, ${recipe.art} art` : "";
  return `${size} ${temp}${product.name}, ${milk}, ${sugar}, ${shots}, ${syrup}${art}. $${priceFor(product, recipe.size)}`;
}

export type SpringState = { y: number; v: number };

export function stepSpring(state: SpringState, dtMs: number, k = 160, c = 9, mass = 0.8): void {
  const dt = Math.min(dtMs, 32) / 1000;
  const acceleration = (-k * state.y - c * state.v) / mass;
  state.v += acceleration * dt;
  state.y += state.v * dt;
  state.y = Math.max(-6, Math.min(6, state.y));
}

export function impulse(state: SpringState, volumeDelta: number): void {
  state.v += (volumeDelta / SIZES.L) * 40;
}
