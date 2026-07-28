import type { Daypart, Menu, MenuProduct } from "@/lib/menu/menu";

const PLAIN = new Set(["bakery", "beans"]);

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  prices: Record<string, string>;
  tags: string[];
  allergens: string[];
  kcal: number | null;
  caffeine_mg: number | null;
};

type SeedCategory = {
  slug: string;
  name: string;
  sort: Record<Daypart, number>;
  products: SeedProduct[];
};

const SEED: SeedCategory[] = [
  {
    slug: "espresso",
    name: "Espresso",
    sort: { morning: 1, afternoon: 4, night: 3 },
    products: [
      {
        slug: "oat-flat-white",
        name: "Oat Flat White",
        description: "Short ristretto with steamed oat milk.",
        prices: { S: "4.80", M: "5.40", L: "5.90" },
        tags: ["vegan"],
        allergens: ["oat"],
        kcal: 120,
        caffeine_mg: 150,
      },
      {
        slug: "espresso",
        name: "Espresso",
        description: "A double shot, served short.",
        prices: { S: "3.20", M: "3.20", L: "3.80" },
        tags: [],
        allergens: [],
        kcal: 10,
        caffeine_mg: 125,
      },
      {
        slug: "decaf-americano",
        name: "Decaf Americano",
        description: "Long black without the caffeine.",
        prices: { S: "3.60", M: "4.10", L: "4.50" },
        tags: ["decaf"],
        allergens: [],
        kcal: 15,
        caffeine_mg: 8,
      },
    ],
  },
  {
    slug: "cold-brew",
    name: "Cold Brew & Nitro",
    sort: { morning: 4, afternoon: 1, night: 5 },
    products: [
      {
        slug: "berry-cold-brew",
        name: "Berry Cold Brew",
        description: "Slow brew with a berry syrup band.",
        prices: { M: "5.40", L: "5.90" },
        tags: ["iced", "vegan"],
        allergens: [],
        kcal: 90,
        caffeine_mg: 180,
      },
      {
        slug: "nitro-cold-brew",
        name: "Nitro Cold Brew",
        description: "Charged cold brew, cascading tan foam.",
        prices: { M: "5.20", L: "5.70" },
        tags: ["iced", "vegan"],
        allergens: [],
        kcal: 15,
        caffeine_mg: 200,
      },
    ],
  },
  {
    slug: "matcha-tea",
    name: "Matcha & Tea",
    sort: { morning: 2, afternoon: 2, night: 2 },
    products: [
      {
        slug: "iced-matcha",
        name: "Iced Matcha",
        description: "Ceremonial matcha shaken over ice.",
        prices: { M: "5.40", L: "5.90" },
        tags: ["iced", "vegan"],
        allergens: ["oat"],
        kcal: 140,
        caffeine_mg: 70,
      },
      {
        slug: "matcha-latte",
        name: "Matcha Latte",
        description: "Whisked matcha with steamed oat milk.",
        prices: { S: "4.90", M: "5.40", L: "5.90" },
        tags: ["vegan"],
        allergens: ["oat"],
        kcal: 160,
        caffeine_mg: 70,
      },
      {
        slug: "decaf-chai",
        name: "Decaf Chai",
        description: "Spiced tea, no caffeine, oat milk.",
        prices: { M: "4.80", L: "5.30" },
        tags: ["decaf", "vegan"],
        allergens: ["oat"],
        kcal: 180,
        caffeine_mg: 0,
      },
    ],
  },
  {
    slug: "signature",
    name: "Signature",
    sort: { morning: 3, afternoon: 3, night: 4 },
    products: [
      {
        slug: "pumpkin-oat-latte",
        name: "Pumpkin Oat Latte",
        description: "Seasonal pumpkin spice over oat milk.",
        prices: { M: "5.80", L: "6.30" },
        tags: ["vegan"],
        allergens: ["oat"],
        kcal: 220,
        caffeine_mg: 140,
      },
      {
        slug: "night-mocha",
        name: "Night Decaf Mocha",
        description: "Cocoa and decaf espresso, served after dusk.",
        prices: { M: "5.60", L: "6.10" },
        tags: ["decaf"],
        allergens: ["milk"],
        kcal: 240,
        caffeine_mg: 10,
      },
    ],
  },
  {
    slug: "bakery",
    name: "Bakery",
    sort: { morning: 5, afternoon: 5, night: 1 },
    products: [
      {
        slug: "almond-croissant",
        name: "Almond Croissant",
        description: "Toasted, with frangipane.",
        prices: { M: "4.20" },
        tags: [],
        allergens: ["gluten", "nuts", "milk"],
        kcal: 380,
        caffeine_mg: 0,
      },
      {
        slug: "vegan-brownie",
        name: "Vegan Brownie",
        description: "Dense cocoa brownie, no dairy.",
        prices: { M: "3.80" },
        tags: ["vegan"],
        allergens: ["gluten"],
        kcal: 320,
        caffeine_mg: 15,
      },
      {
        slug: "gf-cookie",
        name: "Gluten-free Cookie",
        description: "Brown butter cookie without gluten.",
        prices: { M: "3.20" },
        tags: ["gf"],
        allergens: ["milk", "nuts"],
        kcal: 210,
        caffeine_mg: 0,
      },
    ],
  },
  {
    slug: "beans",
    name: "Merch & Beans",
    sort: { morning: 6, afternoon: 6, night: 6 },
    products: [
      {
        slug: "house-beans",
        name: "House Beans",
        description: "250 g, chocolate and red fruit.",
        prices: { M: "14.00" },
        tags: [],
        allergens: [],
        kcal: null,
        caffeine_mg: null,
      },
      {
        slug: "decaf-beans",
        name: "Decaf Beans",
        description: "250 g Swiss-water decaf.",
        prices: { M: "15.00" },
        tags: ["decaf"],
        allergens: [],
        kcal: null,
        caffeine_mg: null,
      },
    ],
  },
];

function displayPrice(prices: Record<string, string>): string {
  return prices.M ?? prices.S ?? prices.L ?? Object.values(prices)[0] ?? "0.00";
}

function toProduct(seed: SeedProduct, categorySlug: string): MenuProduct {
  return {
    id: `fallback:${seed.slug}`,
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    price: displayPrice(seed.prices),
    currency: "USD",
    prices: seed.prices,
    customizable: !PLAIN.has(categorySlug),
    tags: seed.tags,
    allergens: seed.allergens,
    kcal: seed.kcal,
    caffeine_mg: seed.caffeine_mg,
  };
}

/** Offline catalog used when the API/menu DB is unavailable. */
export function fallbackMenu(daypart: Daypart): Menu {
  return {
    store: { slug: "riverside", name: "Crema Riverside", prep_minutes: 6 },
    daypart,
    categories: SEED.map((category) => ({
      slug: category.slug,
      name: category.name,
      sort: category.sort,
      products: category.products.map((product) => toProduct(product, category.slug)),
    })),
  };
}
