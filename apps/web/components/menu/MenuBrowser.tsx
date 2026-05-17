"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  badgeTags,
  buildIndex,
  groupResults,
  orderMenu,
  searchMenu,
  type Daypart,
  type Menu,
  type MenuFilters,
} from "@/lib/menu/menu";

const EMPTY_FILTERS: MenuFilters = { vegan: false, gf: false, decaf: false, iced: false };

const FILTERS: { key: keyof MenuFilters; label: string }[] = [
  { key: "vegan", label: "Vegan" },
  { key: "gf", label: "GF" },
  { key: "decaf", label: "Decaf" },
  { key: "iced", label: "Iced" },
];

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <Link href="/" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
            Crema
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Menu</h1>
          <p className="mt-2 font-sans text-sm text-muted">
            {menu.store.name} · ready in about {menu.store.prep_minutes} min
          </p>
        </div>
      </header>
      <div className="glass-surface px-4 py-4" data-glass="lite">
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
                className={`rounded-full px-4 py-2 font-sans text-sm ${
                  pressed ? "bg-primary text-on-primary" : "bg-surface/80 text-foreground"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
      {results.length === 0 ? (
        <p className="font-sans text-base text-muted" role="status">
          Nothing matches that search.
        </p>
      ) : (
        results.map((group) => (
          <section key={group.slug} aria-labelledby={`cat-${group.slug}`}>
            <h2 id={`cat-${group.slug}`} className="font-display text-2xl font-semibold">
              {group.name}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {group.products.map((product) => (
                <li key={product.id} className="menu-card flex h-full flex-col gap-3 rounded-3xl p-5">
                  <Link href={`/menu/${product.slug}`} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-sans text-lg font-semibold">{product.name}</h3>
                      <span className="rounded-full bg-surface px-3 py-1 font-mono text-sm">
                        ${product.price}
                      </span>
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
                    <Link href={`/menu/${product.slug}/customize`} className="font-sans text-sm text-foreground">
                      Build this cup
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
