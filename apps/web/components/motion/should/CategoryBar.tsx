"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { categoryStyle } from "@/lib/motion/should";

type Chip = { slug: string; name: string };

export function CategoryBar({ categories }: { categories: Chip[] }) {
  const tier = useTier();
  const list = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const lock = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const first = categories[0]?.slug;
      if (first) setActive(first);
    });
    return () => cancelAnimationFrame(frame);
  }, [categories]);

  useEffect(() => {
    const root = list.current;
    const marker = pill.current;
    const chip = root?.querySelector<HTMLButtonElement>(`[data-slug="${active}"]`);
    if (!root || !marker || !chip) return;
    const style = categoryStyle(active);
    marker.style.background = style.fill;
    const target = chip.offsetLeft;
    const width = chip.offsetWidth;
    if (tier === "static") {
      marker.style.transform = `translateX(${target}px)`;
      marker.style.width = `${width}px`;
      return;
    }
    let lead = target;
    let trail = target;
    const start = marker.getBoundingClientRect().left - root.getBoundingClientRect().left;
    lead = start;
    trail = start;
    let frame = 0;
    const tick = () => {
      const pace = tier === "lite" ? 0.45 : 0.28;
      lead += (target - lead) * (tier === "lite" ? pace : 0.45);
      trail += (target - trail) * pace;
      const left = tier === "lite" ? lead : Math.min(lead, trail);
      const span = tier === "lite" ? width : Math.abs(lead - trail) + width;
      marker.style.transform = `translateX(${left}px)`;
      marker.style.width = `${span}px`;
      if (Math.abs(target - lead) > 0.6 || Math.abs(target - trail) > 0.6) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, tier]);

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(`cat-${category.slug}`))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (lock.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.id.replace("cat-", "");
        if (id) setActive(id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.2, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  if (categories.length === 0) return null;
  const ink = categoryStyle(active).ink;

  function choose(slug: string) {
    setActive(slug);
    lock.current = true;
    window.setTimeout(() => {
      lock.current = false;
    }, 700);
    document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: tier === "static" ? "auto" : "smooth", block: "start" });
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = categories.findIndex((category) => category.slug === active);
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? categories[index + 1]
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? categories[index - 1]
          : undefined;
    if (!next) return;
    event.preventDefault();
    choose(next.slug);
    list.current?.querySelector<HTMLButtonElement>(`[data-slug="${next.slug}"]`)?.focus();
  }

  return (
    <div ref={list} role="tablist" aria-label="Menu categories" className="category-bar" onKeyDown={onKey}>
      <span ref={pill} className="category-pill" aria-hidden />
      {categories.map((category) => {
        const selected = category.slug === active;
        return (
          <button
            key={category.slug}
            type="button"
            role="tab"
            data-slug={category.slug}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="category-tab"
            style={selected ? { color: ink } : undefined}
            onClick={() => choose(category.slug)}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
