"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LatteLoader } from "@/components/motion/LatteLoader";
import { SteamTrail } from "@/components/motion/could/SteamTrail";
import { useLoaderVisibility } from "@/components/motion/PendingLoader";
import { fetchCart, publishCart, removeCartItem, type Cart } from "@/lib/cart/api";

export function CartView({ initial }: { initial?: Cart }) {
  const [cart, setCart] = useState<Cart | null>(initial ?? null);
  const [error, setError] = useState("");
  const showLoader = useLoaderVisibility(cart === null);

  useEffect(() => {
    let alive = true;
    void fetchCart().then((next) => {
      if (!alive) return;
      setCart(next);
      publishCart(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function remove(id: string) {
    setError("");
    try {
      const next = await removeCartItem(id);
      setCart(next);
      publishCart(next);
    } catch {
      setError("That drink stayed in the cart.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/menu" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Menu
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Cart</h1>
      {showLoader && cart === null ? <LatteLoader label="Loading the cart" /> : null}
      {cart === null ? null : cart.items.length === 0 ? (
        <div className="cart-empty steam-zone relative">
          <SteamTrail />
          <span className="crema-mark" aria-hidden="true" />
          <p className="font-display text-3xl font-semibold tracking-tight">The tray is clear.</p>
          <p className="max-w-sm font-sans text-sm leading-6 text-muted">
            Nothing in the cart yet. Pick a pour from the counter and it will land here.
          </p>
          <Link href="/menu" className="inline-flex w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {cart.items.map((item) => (
            <li key={item.id} className="menu-card flex items-start justify-between gap-4 rounded-3xl p-5">
              <div>
                <h2 className="font-sans text-lg font-semibold">{item.name}</h2>
                <p className="mt-1 font-sans text-sm text-muted">
                  {item.size} · {item.temp} · {item.milk === "none" ? "no milk" : `${item.milk} milk`} · {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono">${item.unit_price}</p>
                <button type="button" className="mt-2 font-sans text-sm text-muted" onClick={() => void remove(item.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {cart ? <p className="font-mono text-3xl">${cart.total}</p> : null}
      {cart && cart.items.length > 0 ? (
        <Link href="/checkout" className="inline-flex w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
          Checkout
        </Link>
      ) : null}
      {error ? (
        <p className="font-sans text-sm text-muted" role="status">
          {error}
        </p>
      ) : null}
    </main>
  );
}
