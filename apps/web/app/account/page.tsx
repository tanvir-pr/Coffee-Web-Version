"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMyOrders, type PlacedOrder } from "@/lib/checkout/api";

type Member = { email: string; name: string; role?: string };

export default function AccountPage() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetch("/backend/v1/me", { cache: "no-store" }).then(async (response) => {
        if (response.ok) {
          setMember((await response.json()) as Member);
          void fetchMyOrders().then(setOrders);
          setReady(true);
          return;
        }
        router.replace("/login");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [router]);

  if (!ready || !member) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
        <p className="font-sans text-sm text-muted" role="status">
          {message || "Opening your account…"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Home
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Account</h1>
      <p className="font-sans text-muted">Signed in as {member.email}</p>
      {member.role === "owner" ? (
        <Link href="/owner" className="w-fit font-sans text-sm underline-offset-4 hover:underline">
          Open owner desk
        </Link>
      ) : null}
      <button
        type="button"
        className="w-fit font-sans text-sm text-muted"
        onClick={() =>
          void fetch("/backend/v1/auth/logout", { method: "POST" }).then(() => {
            router.replace("/login");
          })
        }
      >
        Sign out
      </button>
      <section className="mt-4 flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Past pickups</h2>
        {orders.length === 0 ? (
          <p className="font-sans text-sm text-muted">No orders on this account yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id} className="menu-product-card flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/orders/${order.id}`} className="font-mono text-lg">
                    {order.code}
                  </Link>
                  <span className="font-sans text-sm text-muted">{order.status}</span>
                </div>
                <p className="font-sans text-sm text-muted">
                  {order.items.map((item) => item.name).join(", ")} · ${order.total}
                </p>
                {order.items[0]?.product_slug ? (
                  <Link
                    href={`/menu/${order.items[0].product_slug}/customize`}
                    className="font-sans text-sm underline-offset-4 hover:underline"
                  >
                    Build another cup
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {message ? (
        <p className="font-sans text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </main>
  );
}
