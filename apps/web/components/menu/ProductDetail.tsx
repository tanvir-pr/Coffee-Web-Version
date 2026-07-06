"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LiveCup } from "@/components/cup/LiveCup";
import { SectionReveal } from "@/components/motion/should/SectionReveal";
import { drinkFor } from "@/lib/cup/drinks";
import { initialRecipe } from "@/lib/cup/recipe";
import { badgeTags, type Menu, type MenuProduct } from "@/lib/menu/menu";

export function ProductDetail({
  menu,
  product,
}: {
  menu: Menu;
  product: MenuProduct;
}) {
  const drink = useMemo(() => drinkFor(product.slug), [product.slug]);
  const recipe = useMemo(() => initialRecipe(product, drink), [product, drink]);
  const related = useMemo(() => {
    for (const category of menu.categories) {
      if (category.products.some((item) => item.id === product.id)) {
        return category.products.filter((item) => item.id !== product.id).slice(0, 3);
      }
    }
    return [];
  }, [menu, product.id]);
  const sizes = Object.entries(product.prices);

  return (
    <main className="pdp-shell">
      <SectionReveal className="pdp-cup-panel">
        <LiveCup recipe={recipe} className="live-cup h-72 w-full text-foreground" />
      </SectionReveal>
      <div className="flex flex-col gap-6">
        <Link href="/menu" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
          {menu.store.name} menu
        </Link>
        <SectionReveal>
          <h1 className="font-display text-5xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-4 font-sans text-lg leading-8 text-muted">{product.description}</p>
          <p className="mt-4 font-mono text-3xl">${product.price}</p>
        </SectionReveal>
        {badgeTags(product.tags).length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {badgeTags(product.tags).map((tag) => (
              <li key={tag} className="choice-chip rounded-full px-3 py-1 font-sans text-sm uppercase">
                {tag === "gf" ? "GF" : tag}
              </li>
            ))}
          </ul>
        ) : null}
        <SectionReveal>
          <h2 className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Tasting</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4 font-sans text-sm">
            <div>
              <dt className="text-muted">Energy</dt>
              <dd className="mt-1 text-base">{product.kcal === null ? "—" : `${product.kcal} kcal`}</dd>
            </div>
            <div>
              <dt className="text-muted">Caffeine</dt>
              <dd className="mt-1 text-base">{product.caffeine_mg === null ? "—" : `${product.caffeine_mg} mg`}</dd>
            </div>
          </dl>
          {product.allergens.length > 0 ? (
            <p className="mt-4 font-sans text-sm text-muted">Contains {product.allergens.join(", ")}.</p>
          ) : null}
        </SectionReveal>
        {sizes.length > 1 ? (
          <SectionReveal>
            <h2 className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Sizes</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {sizes.map(([size, price]) => (
                <li key={size} className="choice-chip rounded-full px-4 py-2 font-sans text-sm">
                  {size} · ${price}
                </li>
              ))}
            </ul>
          </SectionReveal>
        ) : null}
        {product.customizable ? (
          <Link
            href={`/menu/${product.slug}/customize`}
            className="sticky bottom-4 inline-flex w-fit rounded-full bg-primary px-6 py-3 font-sans text-sm text-on-primary shadow-lg"
          >
            Build this cup
          </Link>
        ) : null}
        {related.length > 0 ? (
          <SectionReveal className="mt-4 border-t border-[var(--crema-rim)] pt-8">
            <h2 className="font-display text-2xl font-semibold">Also on the counter</h2>
            <ul className="mt-4 grid gap-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={`/menu/${item.slug}`} className="flex items-center justify-between gap-3 font-sans text-base">
                    <span>{item.name}</span>
                    <span className="font-mono text-sm">${item.price}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionReveal>
        ) : null}
      </div>
    </main>
  );
}
