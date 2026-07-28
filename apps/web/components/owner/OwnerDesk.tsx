"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Ticket = { id: string; code: string; status: string; contact_name: string; items: string[] };
type Overview = {
  owner: { email: string; name: string; role: string };
  store: string;
  open_orders: number;
  queue: Ticket[];
};

export function OwnerDesk({
  initialEmail,
  initialName,
}: {
  initialEmail: string;
  initialName: string;
}) {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void fetch("/backend/v1/owner/overview", { cache: "no-store" }).then(async (response) => {
      if (!alive) return;
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/account");
        return;
      }
      if (!response.ok) {
        setError("Owner desk could not load.");
        return;
      }
      setOverview((await response.json()) as Overview);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  const openOrders = overview?.open_orders ?? null;
  const queue = overview?.queue ?? [];
  const email = overview?.owner.email ?? initialEmail;
  const name = overview?.owner.name ?? initialName;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Owner</p>
          <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">Desk</h1>
          <p className="mt-3 font-sans text-muted">
            {name} · {email}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full px-4 py-2 font-sans text-sm text-muted"
          onClick={() =>
            void fetch("/backend/v1/auth/logout", { method: "POST" }).then(() => router.replace("/login"))
          }
        >
          Sign out
        </button>
      </div>

      <section className="menu-card flex flex-col gap-3 rounded-3xl p-6">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Riverside</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          {openOrders === null
            ? "Loading the bar…"
            : openOrders === 0
              ? "Queue is clear"
              : `${openOrders} open on the bar`}
        </h2>
        <p className="font-sans text-sm leading-6 text-muted">
          Advance tickets on the barista board, then come back here for a quick pulse.
        </p>
        <Link
          href="/kds"
          className="mt-2 inline-flex w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary"
        >
          Open barista board
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Live tickets</h2>
        {error ? <p className="font-sans text-sm text-muted">{error}</p> : null}
        {!overview ? (
          <p className="font-sans text-sm text-muted">Pulling the queue…</p>
        ) : queue.length === 0 ? (
          <p className="font-sans text-sm text-muted">No active tickets right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.map((ticket) => (
              <li key={ticket.id} className="menu-product-card flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-lg">{ticket.code}</span>
                  <span className="font-sans text-sm text-muted">{ticket.status}</span>
                </div>
                <p className="font-sans text-sm text-muted">{ticket.contact_name}</p>
                <p className="font-sans text-sm">{ticket.items.join(" · ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/menu" className="rounded-full px-4 py-2 font-sans text-sm underline-offset-4 hover:underline">
          Browse menu
        </Link>
        <Link href="/stores" className="rounded-full px-4 py-2 font-sans text-sm underline-offset-4 hover:underline">
          Stores
        </Link>
        <Link href="/account" className="rounded-full px-4 py-2 font-sans text-sm underline-offset-4 hover:underline">
          Member view
        </Link>
      </div>
    </main>
  );
}
