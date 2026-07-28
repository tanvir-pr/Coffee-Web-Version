"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CafeSound } from "@/components/motion/could/CafeSound";
import { fetchCart, type Cart } from "@/lib/cart/api";

const BASE_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/stores", label: "Stores" },
  { href: "/story", label: "Our story" },
  { href: "/rewards", label: "Rewards" },
];

function current(pathname: string, href: string): boolean {
  if (href === "/login" || href === "/account" || href === "/owner") {
    return (
      pathname === "/login" ||
      pathname === "/account" ||
      pathname.startsWith("/account/") ||
      pathname === "/owner" ||
      pathname === "/kds"
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [accountHref, setAccountHref] = useState("/login");
  const [accountLabel, setAccountLabel] = useState("Account");
  const hide = pathname === "/login";
  const links = [...BASE_LINKS, { href: accountHref, label: accountLabel }];

  useEffect(() => {
    if (pathname === "/login") return;
    let active = true;
    void fetchCart().then((cart) => {
      if (active) setCount(cart.count);
    });
    void fetch("/backend/v1/me", { cache: "no-store" }).then(async (response) => {
      if (!active) return;
      if (!response.ok) {
        setAccountHref("/login");
        setAccountLabel("Account");
        return;
      }
      const me = (await response.json()) as { role?: string };
      if (me.role === "owner") {
        setAccountHref("/owner");
        setAccountLabel("Owner");
        return;
      }
      setAccountHref("/account");
      setAccountLabel("Account");
    });
    const onCart = (event: Event) => setCount((event as CustomEvent<Cart>).detail.count);
    window.addEventListener("crema:cart", onCart);
    return () => {
      active = false;
      window.removeEventListener("crema:cart", onCart);
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (hide) return null;

  const cartLabel = count === 0 ? "Cart, empty" : `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <header className="site-header sticky top-0 z-40">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="crema-brand">
          <span className="crema-mark" aria-hidden="true" />
          <span className="font-display text-2xl font-semibold tracking-tight">Crema</span>
        </Link>
        <nav aria-label="Crema" className="ml-4 hidden min-w-0 items-center gap-1 md:flex">
          {links.map((link) => (
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
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
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
