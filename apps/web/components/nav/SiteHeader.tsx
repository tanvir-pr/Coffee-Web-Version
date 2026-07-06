"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CafeSound } from "@/components/motion/could/CafeSound";
import { fetchCart, type Cart } from "@/lib/cart/api";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/stores", label: "Stores" },
  { href: "/story", label: "Our story" },
  { href: "/rewards", label: "Rewards" },
  { href: "/account", label: "Account" },
];

function current(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetchCart().then((cart) => setCount(cart.count));
    });
    const onCart = (event: Event) => setCount((event as CustomEvent<Cart>).detail.count);
    window.addEventListener("crema:cart", onCart);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("crema:cart", onCart);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const cartLabel = count === 0 ? "Cart, empty" : `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <header className="site-header sticky top-0 z-40">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
          Crema
        </Link>
        <nav aria-label="Crema" className="ml-4 hidden min-w-0 items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current(pathname, link.href) ? "page" : undefined}
              className="site-link rounded-full px-3 py-2 font-sans text-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden lg:inline">
            <CafeSound />
          </span>
          <Link
            id="cart"
            href="/cart"
            aria-label={cartLabel}
            aria-current={current(pathname, "/cart") ? "page" : undefined}
            className="site-link flex items-center gap-2 rounded-full px-3 py-2 font-sans text-sm"
          >
            Cart
            <span id="cart-badge" className="cart-badge font-mono" aria-hidden={count === 0}>
              {count === 0 ? "" : count}
            </span>
          </Link>
          <button
            type="button"
            className="rounded-full px-3 py-2 font-sans text-sm md:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="site-menu" aria-label="Crema menu" className="flex flex-col gap-1 border-t border-[var(--crema-rim)] px-4 py-3 md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current(pathname, link.href) ? "page" : undefined}
              className="site-link rounded-2xl px-3 py-3 font-sans text-base"
            >
              {link.label}
            </Link>
          ))}
          <CafeSound />
        </nav>
      ) : null}
    </header>
  );
}
