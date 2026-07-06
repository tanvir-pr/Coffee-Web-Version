"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { LiveCup } from "@/components/cup/LiveCup";
import { MagneticButton } from "@/components/motion/should/MagneticButton";
import { CupPreview } from "@/components/motion/could/CupPreview";
import { TiltControl } from "@/components/motion/could/TiltControl";
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
    <div className="cup-builder glass-surface flex max-h-[calc(100dvh-6.5rem)] w-full min-w-0 max-w-4xl flex-col">
      <div className="flex min-w-0 items-start justify-between gap-3 px-5 pt-5 sm:px-7">
        <div className="min-w-0">
          <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Build</p>
          <h1 id="customizer-title" className="font-display text-4xl font-semibold tracking-tight break-words">
            {product.name}
          </h1>
        </div>
        <Link href={`/menu/${product.slug}`} className="shrink-0 font-sans text-sm text-muted">
          Close
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-4 sm:px-7 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
      <div className="min-w-0">
        <LiveCup recipe={recipe} />
        <CupPreview color={drink.blended} />
        <TiltControl />
        <p className="mt-3 font-sans text-sm leading-6 text-muted" aria-live="polite">
          {summary}
        </p>
      </div>
      <form className="flex min-w-0 flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
        <Choice
          label="Size"
          value={recipe.size}
          options={sizes.map((size) => ({
            value: size,
            label: `${SIZE_NAME[size]} · ${SIZES_ML[size]} ml`,
          }))}
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
              className="choice-chip rounded-full px-4 py-2 font-sans text-sm"
              onClick={() => setRecipe((current) => ({ ...current, shots: Math.max(1, current.shots - 1) }))}
            >
              Less
            </button>
            <span className="font-mono text-lg">{recipe.shots}</span>
            <button
              type="button"
              className="choice-chip rounded-full px-4 py-2 font-sans text-sm"
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
      </form>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-[var(--crema-rim)] px-5 py-4 sm:px-7">
        <p className="font-mono text-3xl">${priceFor(product, recipe.size)}</p>
        <MagneticButton
          ref={addRef}
          type="button"
          onClick={() => void addToOrder()}
          className="inline-flex w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary"
        >
          Add to order
        </MagneticButton>
      </div>
      {notice ? (
        <p className="px-5 pb-4 font-sans text-sm text-muted sm:px-7" aria-live="polite">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

const SIZES_ML: Record<Size, number> = { S: 240, M: 360, L: 480 };
const SIZE_NAME: Record<Size, string> = { S: "Small", M: "Medium", L: "Large" };

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
              className="choice-chip rounded-full px-4 py-2 font-sans text-sm"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
