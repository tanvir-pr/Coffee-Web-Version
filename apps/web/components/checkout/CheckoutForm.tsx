"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { confirmDevPayment, fetchQuote, placeOrder, type Quote } from "@/lib/checkout/api";
import { publishCart } from "@/lib/cart/api";

export function CheckoutForm() {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetchQuote().then(setQuote);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  async function submit() {
    if (!quote || quote.items.length === 0 || pending) return;
    setPending(true);
    setError("");
    try {
      const order = method === "card" ? await placeOrder({ paymentMethod: "card", name, phone }) : await placeOrder({ paymentMethod: "cash", name, phone });
      const paid = order.provider === "dev" ? await confirmDevPayment(order.id) : order;
      publishCart({ count: 0, total: "0.00", currency: paid.currency, items: [] });
      router.push(`/orders/${paid.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be completed.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/cart" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Cart
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Checkout</h1>
      {quote === null ? (
        <p className="font-sans text-muted">Loading the order.</p>
      ) : quote.items.length === 0 ? (
        <p className="font-sans text-muted">
          Nothing to check out. <Link href="/menu">Browse the menu</Link>.
        </p>
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="font-sans text-sm text-muted">
            Pickup at {quote.store_name}. Ready in about {quote.prep_minutes} min.
          </p>
          <ul className="flex flex-col gap-3">
            {quote.items.map((item) => (
              <li key={`${item.name}-${item.unit_price}`} className="flex justify-between font-sans">
                <span>
                  {item.name} · {item.quantity}
                </span>
                <span className="font-mono">${item.unit_price}</span>
              </li>
            ))}
          </ul>
          <p className="font-sans text-sm text-muted">Subtotal ${quote.subtotal}</p>
          <p className="font-sans text-sm text-muted">Tax ${quote.tax}</p>
          <p className="font-mono text-3xl">${quote.total}</p>
          <label className="flex flex-col gap-2 font-sans text-sm">
            Name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-2xl border border-muted bg-transparent px-4 py-3"
              autoComplete="name"
            />
          </label>
          <label className="flex flex-col gap-2 font-sans text-sm">
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-2xl border border-muted bg-transparent px-4 py-3"
              autoComplete="tel"
            />
          </label>
          <fieldset className="flex gap-3">
            <legend className="mb-2 font-sans text-sm">Payment</legend>
            <button type="button" aria-pressed={method === "cash"} className="rounded-full px-4 py-2 font-sans text-sm" onClick={() => setMethod("cash")}>
              Cash at the counter
            </button>
            <button type="button" aria-pressed={method === "card"} className="rounded-full px-4 py-2 font-sans text-sm" onClick={() => setMethod("card")}>
              Card
            </button>
          </fieldset>
          <button type="submit" disabled={pending} className="inline-flex w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
            {pending ? "Placing order" : method === "cash" ? "Place pickup order" : "Pay"}
          </button>
          <p className="font-sans text-sm text-muted" role="status">
            {error}
          </p>
        </form>
      )}
    </main>
  );
}
