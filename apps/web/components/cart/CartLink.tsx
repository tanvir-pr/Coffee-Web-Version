"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCart, type Cart } from "@/lib/cart/api";

export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetchCart().then((cart) => setCount(cart.count));
    });
    const onCart = (event: Event) => {
      const cart = (event as CustomEvent<Cart>).detail;
      setCount(cart.count);
    };
    window.addEventListener("crema:cart", onCart);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("crema:cart", onCart);
    };
  }, []);

  return (
    <Link
      id="cart"
      href="/cart"
      aria-label={
        count === 0 ? "Cart, empty" : `Cart, ${count} ${count === 1 ? "item" : "items"}`
      }
      className="fixed top-4 right-4 z-40 flex items-center gap-2 rounded-full bg-surface px-4 py-2 font-sans text-sm shadow-sm"
    >
      Cart
      <span id="cart-badge" className="cart-badge font-mono" aria-hidden={count === 0}>
        {count === 0 ? "" : count}
      </span>
    </Link>
  );
}
