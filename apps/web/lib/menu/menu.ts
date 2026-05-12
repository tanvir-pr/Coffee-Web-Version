export type Daypart = "morning" | "afternoon" | "night";

export type MenuProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  tags: string[];
  allergens: string[];
  kcal: number | null;
  caffeine_mg: number | null;
};

export type MenuCategory = {
  slug: string;
  name: string;
  sort: Record<Daypart, number>;
  products: MenuProduct[];
};

export type Menu = {
  store: { slug: string; name: string; prep_minutes: number };
  daypart: Daypart;
  categories: MenuCategory[];
};

export type MenuFilters = {
  vegan: boolean;
  gf: boolean;
  decaf: boolean;
  iced: boolean;
};

export type MenuEntry = {
  category: string;
  categorySlug: string;
  product: MenuProduct;
  haystack: string;
};

const BADGE_TAGS = ["vegan", "gf", "decaf"] as const;

export function badgeTags(tags: string[]): string[] {
  return BADGE_TAGS.filter((tag) => tags.includes(tag));
}

export function orderMenu(menu: Menu, daypart: Daypart): Menu {
  const categories = [...menu.categories]
    .sort((a, b) => a.sort[daypart] - b.sort[daypart])
    .map((category) => ({
      ...category,
      products:
        daypart === "night"
          ? [...category.products].sort((a, b) => Number(b.tags.includes("decaf")) - Number(a.tags.includes("decaf")))
          : category.products,
    }));
  return { ...menu, daypart, categories };
}

export function buildIndex(menu: Menu): MenuEntry[] {
  return menu.categories.flatMap((category) =>
    category.products.map((product) => ({
      category: category.name,
      categorySlug: category.slug,
      product,
      haystack: [product.name, product.description, category.name, ...product.tags, ...product.allergens]
        .join(" ")
        .toLowerCase(),
    })),
  );
}

export function searchMenu(index: MenuEntry[], query: string, filters: MenuFilters): MenuEntry[] {
  const needle = query.trim().toLowerCase();
  return index.filter((entry) => {
    if (needle && !entry.haystack.includes(needle)) return false;
    if (filters.vegan && !entry.product.tags.includes("vegan")) return false;
    if (filters.gf && !entry.product.tags.includes("gf")) return false;
    if (filters.decaf && !entry.product.tags.includes("decaf")) return false;
    if (filters.iced && !entry.product.tags.includes("iced")) return false;
    return true;
  });
}

export function groupResults(entries: MenuEntry[]): { slug: string; name: string; products: MenuProduct[] }[] {
  const groups: { slug: string; name: string; products: MenuProduct[] }[] = [];
  for (const entry of entries) {
    const current = groups.at(-1);
    if (!current || current.slug !== entry.categorySlug) {
      groups.push({ slug: entry.categorySlug, name: entry.category, products: [entry.product] });
    } else {
      current.products.push(entry.product);
    }
  }
  return groups;
}

export function menuJsonLd(menu: Menu, origin: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${menu.store.name} menu`,
    hasMenuSection: menu.categories.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      hasMenuItem: category.products.map((product) => ({
        "@type": "MenuItem",
        name: product.name,
        description: product.description,
        url: `${origin}/menu/${product.slug}`,
        suitableForDiet: product.tags.includes("vegan") ? "https://schema.org/VeganDiet" : undefined,
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: product.currency,
        },
      })),
    })),
  };
}
