"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderTracker } from "@/components/track/OrderTracker";
import { fetchOrder, type PlacedOrder } from "@/lib/checkout/api";

export function OrderReceipt({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetchOrder(orderId).then((next) => {
        if (next) setOrder(next);
        else setMissing(true);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [orderId]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/menu" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Menu
      </Link>
      {missing ? (
        <h1 className="font-display text-5xl font-semibold tracking-tight">Order not found</h1>
      ) : order === null ? (
        <h1 className="font-display text-5xl font-semibold tracking-tight">Order</h1>
      ) : (
        <>
          <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Pickup code</p>
          <h1 className="font-mono text-5xl">{order.code}</h1>
          <p className="font-sans text-lg">
            {order.payment_status === "paid"
              ? "Paid"
              : order.payment_status === "unpaid_cash"
                ? "Pay at the counter"
                : "Payment pending"}{" "}
            · ${order.total}
          </p>
          <ul className="flex flex-col gap-2">
            {order.items.map((item) => (
              <li key={`${item.name}-${item.size}`} className="font-sans">
                {item.quantity} × {item.name}, {item.size}
              </li>
            ))}
          </ul>
          {order.status === "pending_payment" ? null : <OrderTracker orderId={orderId} initial={order} />}
        </>
      )}
    </main>
  );
}
