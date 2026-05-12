import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { badgeTags, type Daypart, type Menu, type MenuProduct } from "@/lib/menu/menu";
import { readServerClock } from "@/lib/theme/server-clock";
import { resolveTimeOfDay } from "@/lib/theme/timeOfDay";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

async function findProduct(slug: string, daypart: Daypart): Promise<{ menu: Menu; product: MenuProduct } | null> {
  try {
    const response = await fetch(`${API_URL}/v1/menu?store=riverside&daypart=${daypart}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const menu = (await response.json()) as Menu;
    for (const category of menu.categories) {
      const product = category.products.find((item) => item.slug === slug);
      if (product) return { menu, product };
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug.replaceAll("-", " ")} · Crema` };
}

export default async function MenuItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clock = await readServerClock();
  const daypart: Daypart = clock ? resolveTimeOfDay(clock.hour, clock.minute) : "afternoon";
  const found = await findProduct(slug, daypart);
  if (!found) notFound();
  const { menu, product } = found;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: product.name,
    description: product.description,
    offers: { "@type": "Offer", price: product.price, priceCurrency: product.currency },
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/menu" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        {menu.store.name} menu
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">{product.name}</h1>
      <p className="font-sans text-lg leading-8 text-muted">{product.description}</p>
      <p className="font-mono text-2xl">${product.price}</p>
      {badgeTags(product.tags).length > 0 ? (
        <ul className="flex gap-2">
          {badgeTags(product.tags).map((tag) => (
            <li key={tag} className="rounded-full border border-[var(--crema-rim)] px-3 py-1 font-sans text-sm uppercase">
              {tag === "gf" ? "GF" : tag}
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="grid grid-cols-2 gap-4 font-sans text-sm">
        <div>
          <dt className="text-muted">Energy</dt>
          <dd>{product.kcal === null ? "—" : `${product.kcal} kcal`}</dd>
        </div>
        <div>
          <dt className="text-muted">Caffeine</dt>
          <dd>{product.caffeine_mg === null ? "—" : `${product.caffeine_mg} mg`}</dd>
        </div>
      </dl>
      {product.allergens.length > 0 ? (
        <p className="font-sans text-sm text-muted">Contains {product.allergens.join(", ")}.</p>
      ) : null}
    </main>
  );
}
