import type { Daypart, Menu, MenuProduct } from "@/lib/menu/menu";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export async function fetchMenu(daypart: Daypart): Promise<Menu | null> {
  try {
    const response = await fetch(`${API_URL}/v1/menu?store=riverside&daypart=${daypart}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as Menu;
  } catch {
    return null;
  }
}

export async function findProduct(
  slug: string,
  daypart: Daypart,
): Promise<{ menu: Menu; product: MenuProduct } | null> {
  const menu = await fetchMenu(daypart);
  if (!menu) return null;
  for (const category of menu.categories) {
    const product = category.products.find((item) => item.slug === slug);
    if (product) return { menu, product };
  }
  return null;
}
