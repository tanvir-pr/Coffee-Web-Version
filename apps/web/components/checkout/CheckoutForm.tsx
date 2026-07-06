"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LatteLoader } from "@/components/motion/LatteLoader";
import { HoldToConfirm } from "@/components/motion/should/HoldToConfirm";
import { PendingLoader, useLoaderVisibility } from "@/components/motion/PendingLoader";
import { publishCart } from "@/lib/cart/api";
import { confirmDevPayment, fetchQuote, placeOrder, type Quote } from "@/lib/checkout/api";

export function CheckoutForm() {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [applyReward, setApplyReward] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [slot, setSlot] = useState("");
  const quoteLoader = useLoaderVisibility(quote === null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSlot(window.sessionStorage.getItem("crema:slot") ?? "");
      void fetchQuote(applyReward).then(setQuote);
    });
    return () => cancelAnimationFrame(frame);
  }, [applyReward]);

  async function submit() {
    if (!quote || quote.items.length === 0 || pending) return;
    setPending(true);
    setError("");
    void import("@/components/motion/should/Cheers");
    try {
      const order =
        method === "card"
          ? await placeOrder({ paymentMethod: "card", name, phone, applyReward })
          : await placeOrder({ paymentMethod: "cash", name, phone, applyReward });
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
      {slot ? <p className="font-sans text-muted">Pickup slot {new Date(slot).toLocaleString()}</p> : null}
      {quote === null || quoteLoader ? (
        quoteLoader ? <LatteLoader label="Loading the order" /> : null
      ) : quote.items.length === 0 ? (
        <p className="font-sans text-muted">
          Nothing to check out. <Link href="/menu">Browse the menu</Link>.
        </p>
      ) : (
        <form
          ref={form}
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
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
          {quote.discount && quote.discount !== "0.00" ? (
            <p className="font-sans text-sm text-muted">Reward −${quote.discount}</p>
          ) : null}
          <p className="font-sans text-sm text-muted">Tax ${quote.tax}</p>
          <p className="font-mono text-3xl">${quote.total}</p>
          {quote.reward_available ? (
            <label className="flex items-center gap-3 font-sans text-sm">
              <input
                type="checkbox"
                checked={applyReward}
                onChange={(event) => setApplyReward(event.target.checked)}
              />
              Apply a free drink reward
            </label>
          ) : null}
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
          <PendingLoader active={pending} label="Placing the order" />
          <HoldToConfirm
            total={quote.total}
            disabled={pending}
            onConfirm={() => {
              if (!form.current?.reportValidity()) return;
              void submit();
            }}
          />
          <p className="font-sans text-sm text-muted" role="status">
            {error}
          </p>
        </form>
      )}
    </main>
  );
}
