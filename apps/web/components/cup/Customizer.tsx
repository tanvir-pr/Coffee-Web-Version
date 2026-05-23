"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { LiveCup } from "@/components/cup/LiveCup";
import { addCartItem, publishCart } from "@/lib/cart/api";
import { launchCup } from "@/lib/cart/fly";
import { drinkFor } from "@/lib/cup/drinks";
import {
  describeRecipe,
  initialRecipe,
  priceFor,
  sizesFor,
  type Art,
  type Milk,
  type Recipe,
  type Size,
  type Syrup,
  type Temp,
} from "@/lib/cup/recipe";
import { useTier } from "@/app/providers/MotionProvider";
import type { MenuProduct } from "@/lib/menu/menu";

const MILKS: { value: Milk; label: string }[] = [
  { value: "whole", label: "Whole" },
  { value: "oat", label: "Oat" },
  { value: "almond", label: "Almond" },
  { value: "soy", label: "Soy" },
  { value: "coconut", label: "Coconut" },
  { value: "none", label: "None" },
];

const SYRUPS: { value: Syrup | "none"; label: string }[] = [
  { value: "none", label: "None" },
  { value: "vanilla", label: "Vanilla" },
  { value: "caramel", label: "Caramel" },
  { value: "hazelnut", label: "Hazelnut" },
  { value: "berry", label: "Berry" },
];

const ARTS: { value: Art; label: string }[] = [
  { value: "none", label: "None" },
  { value: "heart", label: "Heart" },
  { value: "leaf", label: "Leaf" },
  { value: "rosetta", label: "Rosetta" },
];

export function Customizer({ product }: { product: MenuProduct }) {
  const drink = useMemo(() => drinkFor(product.slug), [product.slug]);
  const tier = useTier();
  const addRef = useRef<HTMLButtonElement>(null);
  const [recipe, setRecipe] = useState<Recipe>(() => initialRecipe(product, drink));
  const [notice, setNotice] = useState("");
  const sizes = sizesFor(product);
  const summary = describeRecipe(product, recipe);

  async function addToOrder() {
    setNotice("");
    try {
      const cart = await addCartItem(product.slug, recipe);
      publishCart(cart);
      setNotice(tier === "static" ? "Added to order" : `Added ${product.name}`);
      if (tier !== "static") {
        addRef.current?.animate([{ transform: "scale(0.92)" }, { transform: "scale(1)" }], { duration: 100 });
      }
      const from = addRef.current?.getBoundingClientRect();
      if (from) launchCup(from, drink.blended, tier);
    } catch {
      setNotice("Could not add that drink.");
    }
  }

  return (
    <div className="glass-surface grid max-h-[92dvh] w-full max-w-4xl gap-6 overflow-y-auto p-5 sm:p-7 md:grid-cols-[240px_1fr]">
      <div>
        <LiveCup recipe={recipe} />
        <p className="mt-3 font-sans text-sm leading-6 text-muted" aria-live="polite">
          {summary}
        </p>
      </div>
      <form className="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Build</p>
            <h1 id="customizer-title" className="font-display text-4xl font-semibold tracking-tight">
              {product.name}
            </h1>
          </div>
          <Link href={`/menu/${product.slug}`} className="font-sans text-sm text-muted">
            Close
          </Link>
        </div>
        <Choice
          label="Size"
          value={recipe.size}
          options={sizes.map((size) => ({ value: size, label: `${size} · ${SIZES_ML[size]} ml` }))}
          onChange={(size) => setRecipe((current) => ({ ...current, size: size as Size }))}
        />
        <Choice
          label="Milk"
          value={recipe.milk}
          options={MILKS}
          onChange={(milk) => setRecipe((current) => ({ ...current, milk: milk as Milk }))}
        />
        <Choice
          label="Temperature"
          value={recipe.temp}
          options={[
            { value: "hot", label: "Hot" },
            { value: "iced", label: "Iced" },
          ]}
          onChange={(temp) => setRecipe((current) => ({ ...current, temp: temp as Temp }))}
        />
        <Choice
          label="Sugar"
          value={String(recipe.sugar)}
          options={[0, 1, 2, 3, 4].map((count) => ({ value: String(count), label: String(count) }))}
          onChange={(sugar) =>
            setRecipe((current) => ({ ...current, sugar: Number(sugar) as Recipe["sugar"] }))
          }
        />
        <div>
          <p className="font-sans text-sm text-muted">Shots</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-surface px-4 py-2 font-sans text-sm"
              onClick={() => setRecipe((current) => ({ ...current, shots: Math.max(1, current.shots - 1) }))}
            >
              Less
            </button>
            <span className="font-mono text-lg">{recipe.shots}</span>
            <button
              type="button"
              className="rounded-full bg-surface px-4 py-2 font-sans text-sm"
              onClick={() => setRecipe((current) => ({ ...current, shots: Math.min(3, current.shots + 1) }))}
            >
              More
            </button>
          </div>
        </div>
        <Choice
          label="Syrup"
          value={recipe.syrups[0] ?? "none"}
          options={SYRUPS}
          onChange={(syrup) =>
            setRecipe((current) => ({
              ...current,
              syrups: syrup === "none" ? [] : [syrup as Syrup],
            }))
          }
        />
        <Choice
          label="Foam"
          value={recipe.foam ? "yes" : "no"}
          options={[
            { value: "yes", label: "Foam" },
            { value: "no", label: "No foam" },
          ]}
          onChange={(foam) => setRecipe((current) => ({ ...current, foam: foam === "yes" }))}
        />
        <Choice
          label="Latte art"
          value={recipe.art}
          options={ARTS}
          onChange={(art) => setRecipe((current) => ({ ...current, art: art as Art }))}
        />
        <p className="font-mono text-3xl">${priceFor(product, recipe.size)}</p>
        <button
          ref={addRef}
          type="button"
          onClick={() => void addToOrder()}
          className="inline-flex w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary"
        >
          Add to order
        </button>
        <p className="font-sans text-sm text-muted" aria-live="polite">
          {notice}
        </p>
      </form>
    </div>
  );
}

const SIZES_ML: Record<Size, number> = { S: 240, M: 360, L: 480 };

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-sans text-sm text-muted">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const pressed = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(option.value)}
              className={`rounded-full px-4 py-2 font-sans text-sm ${
                pressed ? "bg-primary text-on-primary" : "bg-surface/80 text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
