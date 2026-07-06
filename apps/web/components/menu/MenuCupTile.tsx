"use client";

import { useMemo } from "react";
import { LiveCup } from "@/components/cup/LiveCup";
import { drinkFor } from "@/lib/cup/drinks";
import { initialRecipe } from "@/lib/cup/recipe";
import type { MenuProduct } from "@/lib/menu/menu";

export function MenuCupTile({ product, compact = false }: { product: MenuProduct; compact?: boolean }) {
  const drink = useMemo(() => drinkFor(product.slug), [product.slug]);
  const recipe = useMemo(() => initialRecipe(product, drink), [product, drink]);
  return (
    <div
      className={`menu-cup-tile ${compact ? "menu-cup-tile-compact" : ""}`}
      style={{ background: `linear-gradient(160deg, ${drink.blended}33, transparent 70%)` }}
    >
      <LiveCup recipe={recipe} className={`live-cup w-full text-foreground ${compact ? "h-28" : "h-40"}`} />
    </div>
  );
}
