import { describe, expect, it } from "vitest";
import { buildIndex, orderMenu, searchMenu, type Menu } from "@/lib/menu/menu";

const menu: Menu = {
  store: { slug: "riverside", name: "Crema Riverside", prep_minutes: 6 },
  daypart: "morning",
  categories: [
    {
      slug: "espresso",
      name: "Espresso",
      sort: { morning: 1, afternoon: 4, night: 3 },
      products: [
        {
          id: "1",
          slug: "espresso",
          name: "Espresso",
          description: "A double shot.",
          price: "3.20",
          currency: "USD",
          tags: [],
          allergens: [],
          kcal: 10,
          caffeine_mg: 125,
        },
        {
          id: "2",
          slug: "decaf-americano",
          name: "Decaf Americano",
          description: "Long black without the caffeine.",
          price: "4.10",
          currency: "USD",
          tags: ["decaf"],
          allergens: [],
          kcal: 15,
          caffeine_mg: 8,
        },
      ],
    },
    {
      slug: "bakery",
      name: "Bakery",
      sort: { morning: 5, afternoon: 5, night: 1 },
      products: [
        {
          id: "3",
          slug: "vegan-brownie",
          name: "Vegan Brownie",
          description: "Dense cocoa brownie.",
          price: "3.80",
          currency: "USD",
          tags: ["vegan"],
          allergens: ["gluten"],
          kcal: 320,
          caffeine_mg: 15,
        },
      ],
    },
  ],
};

describe("menu search", () => {
  it("puts desserts first at night and floats decaf within a category", () => {
    const ordered = orderMenu(menu, "night");
    expect(ordered.categories.map((category) => category.slug)).toEqual(["bakery", "espresso"]);
    expect(ordered.categories[1]?.products.map((product) => product.slug)).toEqual([
      "decaf-americano",
      "espresso",
    ]);
  });

  it("filters the index by name and dietary tag in under 50ms", () => {
    const index = buildIndex(orderMenu(menu, "morning"));
    const started = performance.now();
    let matches = searchMenu(index, "matcha", { vegan: false, gf: false, decaf: false, iced: false });
    for (let i = 0; i < 200; i += 1) {
      matches = searchMenu(index, "brownie", { vegan: true, gf: false, decaf: false, iced: false });
    }
    expect(performance.now() - started).toBeLessThan(50);
    expect(matches.map((entry) => entry.product.slug)).toEqual(["vegan-brownie"]);
  });
});
