"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LatteLoader } from "@/components/motion/LatteLoader";
import { useLoaderVisibility } from "@/components/motion/PendingLoader";
import { fetchCart, publishCart, removeCartItem, type Cart } from "@/lib/cart/api";

export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");
  const showLoader = useLoaderVisibility(cart === null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetchCart().then((next) => {
        setCart(next);
        publishCart(next);
      });
    });
    return () => cancelAnimationFrame(frame);
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
      {showLoader ? <LatteLoader label="Loading the cart" /> : null}
      {cart === null || showLoader ? null : cart.items.length === 0 ? (
        <p className="font-sans text-muted">Nothing in the cart yet.</p>
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
      {cart && !showLoader ? <p className="font-mono text-3xl">${cart.total}</p> : null}
      {cart && !showLoader && cart.items.length > 0 ? (
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
