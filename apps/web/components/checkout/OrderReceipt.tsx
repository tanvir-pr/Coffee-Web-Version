"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LatteLoader } from "@/components/motion/LatteLoader";
import { useLoaderVisibility } from "@/components/motion/PendingLoader";
import { PourRefresh } from "@/components/motion/could/PourRefresh";
import { Cheers } from "@/components/motion/should/Cheers";
import { PrintedReceipt } from "@/components/motion/should/PrintedReceipt";
import { OrderTracker } from "@/components/track/OrderTracker";
import { fetchOrder, type PlacedOrder } from "@/lib/checkout/api";

export function OrderReceipt({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const showLoader = useLoaderVisibility(order === null && !missing);

  const load = useCallback(async () => {
    const next = await fetchOrder(orderId);
    if (next) setOrder(next);
    else setMissing(true);
  }, [orderId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
  }, [load]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/menu" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Menu
      </Link>
      {missing ? (
        <h1 className="font-display text-5xl font-semibold tracking-tight">Order not found</h1>
      ) : showLoader ? (
        <LatteLoader label="Loading the order" />
      ) : order === null ? null : (
        <PourRefresh onRefresh={load}>
          <Cheers />
          <p className="font-sans text-lg">Order placed. Your {order.items[0]?.name ?? "drink"} is next.</p>
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
          <PrintedReceipt order={order} />
          {order.status === "pending_payment" ? null : <OrderTracker orderId={orderId} initial={order} />}
        </PourRefresh>
      )}
    </main>
  );
}
