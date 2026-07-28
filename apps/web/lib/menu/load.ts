import { fallbackMenu } from "@/lib/menu/fallback";
import type { Daypart, Menu, MenuProduct } from "@/lib/menu/menu";
import { serverApiUrl } from "@/lib/server-env";

export async function fetchMenu(daypart: Daypart): Promise<Menu> {
  try {
    const response = await fetch(`${serverApiUrl()}/v1/menu?store=riverside&daypart=${daypart}`, {
      next: { revalidate: 60 },
    });
    if (response.ok) return (await response.json()) as Menu;
  } catch {
    /* use fallback below */
  }
  return fallbackMenu(daypart);
}

export function routeSlug(value: string): string {
  return value.replace(/^(?:\(\.\))+/, "");
}

export async function findProduct(
  slug: string,
  daypart: Daypart,
): Promise<{ menu: Menu; product: MenuProduct } | null> {
  const drink = routeSlug(slug);
  const menu = await fetchMenu(daypart);
  for (const category of menu.categories) {
    const product = category.products.find((item) => item.slug === drink);
    if (product) return { menu, product };
  }
  return null;
}
