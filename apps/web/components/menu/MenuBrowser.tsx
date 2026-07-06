"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CategoryBar } from "@/components/motion/should/CategoryBar";
import { SectionReveal } from "@/components/motion/should/SectionReveal";
import { StaggerList } from "@/components/motion/should/StaggerList";
import { MenuCupTile } from "@/components/menu/MenuCupTile";
import { drinkFor } from "@/lib/cup/drinks";
import { categoryStyle } from "@/lib/motion/should";
import { DAYPART_COPY } from "@/lib/motion/reveal";
import {
  badgeTags,
  buildIndex,
  groupResults,
  orderMenu,
  searchMenu,
  type Daypart,
  type Menu,
  type MenuFilters,
  type MenuProduct,
} from "@/lib/menu/menu";

const EMPTY_FILTERS: MenuFilters = { vegan: false, gf: false, decaf: false, iced: false };

const FILTERS: { key: keyof MenuFilters; label: string }[] = [
  { key: "vegan", label: "Vegan" },
  { key: "gf", label: "GF" },
  { key: "decaf", label: "Decaf" },
  { key: "iced", label: "Iced" },
];

function featuredDrinks(menu: Menu): MenuProduct[] {
  const picks: MenuProduct[] = [];
  for (const category of menu.categories) {
    for (const product of category.products) {
      if (!product.customizable) continue;
      picks.push(product);
      if (picks.length >= 3) return picks;
    }
  }
  return picks;
}

export function MenuBrowser({ menu, daypart }: { menu: Menu; daypart: Daypart }) {
  const [activeDaypart, setActiveDaypart] = useState(daypart);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MenuFilters>(EMPTY_FILTERS);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const tod = document.documentElement.dataset.tod;
      if (tod === "morning" || tod === "afternoon" || tod === "night") setActiveDaypart(tod);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const ordered = useMemo(() => orderMenu(menu, activeDaypart), [menu, activeDaypart]);
  const results = useMemo(
    () => groupResults(searchMenu(buildIndex(ordered), query, filters)),
    [ordered, query, filters],
  );
  const chips = useMemo(() => results.map((group) => ({ slug: group.slug, name: group.name })), [results]);
  const featured = useMemo(() => featuredDrinks(ordered), [ordered]);
  const day = DAYPART_COPY[activeDaypart];
  const filtering = query.trim().length > 0 || Object.values(filters).some(Boolean);

  return (
    <div className="menu-showpiece">
      <section className="menu-daypart" data-daypart={activeDaypart} aria-labelledby="menu-title">
        <div className="menu-daypart-inner">
          <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Crema</p>
          <h1 id="menu-title" className="mt-3 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
            Menu
          </h1>
          <p className="mt-3 max-w-xl font-display text-2xl text-foreground/90">{day.title}</p>
          <p className="mt-2 max-w-lg font-sans text-base leading-7 text-muted">{day.line}</p>
          <p className="mt-5 font-sans text-sm text-muted">
            {menu.store.name} · ready in about {menu.store.prep_minutes} min
          </p>
        </div>
      </section>

      {!filtering && featured.length > 0 ? (
        <SectionReveal className="menu-featured">
          <div className="menu-featured-head">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Featured pours</h2>
            <p className="mt-2 max-w-md font-sans text-sm leading-6 text-muted">
              Start with a house favorite, then tune milk, size, and art.
            </p>
          </div>
          <StaggerList className="menu-featured-grid">
            {featured.map((product) => (
              <article key={product.id} className="menu-featured-card">
                <MenuCupTile product={product} />
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-2xl font-semibold tracking-tight">{product.name}</h3>
                    <span className="font-mono text-sm">${product.price}</span>
                  </div>
                  <p className="font-sans text-sm leading-6 text-muted">{product.description}</p>
                  <Link
                    href={`/menu/${product.slug}/customize`}
                    className="mt-2 inline-flex w-fit rounded-full bg-primary px-4 py-2 font-sans text-sm text-on-primary"
                  >
                    Build this cup
                  </Link>
                </div>
              </article>
            ))}
          </StaggerList>
        </SectionReveal>
      ) : null}

      <div className="menu-rail sticky top-[4.25rem] z-20">
        <div className="menu-rail-panel glass-surface px-4 py-4" data-glass="lite">
          <label htmlFor="menu-search" className="font-sans text-sm text-muted">
            Search the menu
          </label>
          <input
            id="menu-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Matcha, decaf, brownie"
            className="mt-2 w-full bg-transparent font-sans text-lg text-foreground outline-none placeholder:text-muted"
          />
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Dietary filters">
            {FILTERS.map((filter) => {
              const pressed = filters[filter.key];
              return (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setFilters((current) => ({ ...current, [filter.key]: !current[filter.key] }))}
                  className={`choice-chip rounded-full px-4 py-2 font-sans text-sm ${
                    pressed ? "is-pressed" : ""
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
        <CategoryBar categories={chips} />
      </div>

      <div className="menu-catalog mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pb-20">
        {results.length === 0 ? (
          <SectionReveal>
            <div className="menu-empty" role="status">
              <p className="font-display text-3xl font-semibold">Nothing poured for that.</p>
              <p className="mt-3 max-w-md font-sans text-base leading-7 text-muted">
                Try a shorter search, clear a filter, or browse the categories above.
              </p>
              <button
                type="button"
                className="mt-6 rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary"
                onClick={() => {
                  setQuery("");
                  setFilters(EMPTY_FILTERS);
                }}
              >
                Clear search
              </button>
            </div>
          </SectionReveal>
        ) : (
          results.map((group) => {
            const style = categoryStyle(group.slug);
            return (
              <SectionReveal key={group.slug}>
                <section aria-labelledby={`cat-${group.slug}`} className="menu-category">
                  <div className="menu-category-head" style={{ ["--cat-fill" as string]: style.fill, ["--cat-ink" as string]: style.ink }}>
                    <h2 id={`cat-${group.slug}`} className="scroll-mt-32 font-display text-3xl font-semibold tracking-tight">
                      {group.name}
                    </h2>
                  </div>
                  <StaggerList className="mt-6 grid gap-4 sm:grid-cols-2">
                    {group.products.map((product) => {
                      const wash = drinkFor(product.slug).blended;
                      return (
                      <article key={product.id} className="menu-card menu-product-card flex h-full flex-col gap-3 rounded-3xl p-5">
                        {product.customizable ? (
                          <div
                            className="menu-cup-tile menu-cup-tile-compact"
                            style={{ background: `linear-gradient(160deg, ${wash}55, transparent 72%)` }}
                            aria-hidden
                          />
                        ) : null}
                        <Link href={`/menu/${product.slug}`} className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-sans text-lg font-semibold">{product.name}</h3>
                            <span className="rounded-full bg-surface px-3 py-1 font-mono text-sm">${product.price}</span>
                          </div>
                          <p className="font-sans text-sm leading-6 text-muted">{product.description}</p>
                        </Link>
                        {badgeTags(product.tags).length > 0 ? (
                          <ul className="flex flex-wrap gap-2">
                            {badgeTags(product.tags).map((tag) => (
                              <li
                                key={tag}
                                className="rounded-full border border-[var(--crema-rim)] px-2 py-1 font-sans text-xs tracking-wide uppercase"
                              >
                                {tag === "gf" ? "GF" : tag}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {product.customizable ? (
                          <Link
                            href={`/menu/${product.slug}/customize`}
                            className="mt-auto font-sans text-sm font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            Build this cup
                          </Link>
                        ) : null}
                      </article>
                    );
                    })}
                  </StaggerList>
                </section>
              </SectionReveal>
            );
          })
        )}
      </div>
    </div>
  );
}
