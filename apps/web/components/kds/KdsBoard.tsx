"use client";

import { useEffect, useState } from "react";
import { PendingLoader } from "@/components/motion/PendingLoader";
import { STAGE_LABEL, nextStage, type Stage } from "@/lib/track/stages";

type Ticket = {
  id: string;
  code: string;
  status: string;
  contact_name: string;
  items: string[];
};

type Booking = {
  id: string;
  contact_name: string;
  party: number;
  area: string;
  starts_at: string;
  status: string;
};

export function KdsBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  async function load() {
    const response = await fetch("/backend/v1/kds/orders?store=riverside", { cache: "no-store" });
    if (!response.ok) {
      setError("The queue could not be loaded.");
      setLoaded(true);
      return;
    }
    setTickets((await response.json()) as Ticket[]);
    const reservations = await fetch("/backend/v1/kds/reservations?store=riverside", { cache: "no-store" });
    if (reservations.ok) setBookings((await reservations.json()) as Booking[]);
    setLoaded(true);
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  async function move(ticket: Ticket, status: string, note: string) {
    setError("");
    setWorking(true);
    const response = await fetch(`/backend/v1/kds/orders/${ticket.id}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, reason: note || null }),
    });
    if (!response.ok) {
      setError("That stage could not be saved.");
      setWorking(false);
      return;
    }
    await load();
    setWorking(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="font-display text-5xl font-semibold tracking-tight">Barista</h1>
      <PendingLoader active={!loaded || working} label="Loading the queue" />
      {loaded && tickets.length === 0 ? <p className="font-sans text-muted">The queue is clear.</p> : null}
      <ul className="flex flex-col gap-4">
        {tickets.map((ticket) => {
          const upcoming = nextStage(ticket.status);
          return (
            <li key={ticket.id} className="menu-card flex flex-col gap-3 rounded-3xl p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-mono text-3xl">{ticket.code}</h2>
                <p className="font-sans">{STAGE_LABEL[ticket.status as Stage] ?? ticket.status}</p>
              </div>
              <p className="font-sans text-sm text-muted">{ticket.contact_name}</p>
              <ul>
                {ticket.items.map((item) => (
                  <li key={item} className="font-sans">
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                {upcoming ? (
                  <button type="button" className="rounded-full bg-primary px-4 py-2 font-sans text-sm text-on-primary" onClick={() => void move(ticket, upcoming, "")}>
                    Mark {STAGE_LABEL[upcoming]}
                  </button>
                ) : null}
                <button type="button" className="rounded-full px-4 py-2 font-sans text-sm" onClick={() => void move(ticket, "cancelled", reason)}>
                  Cancel
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <h2 className="font-display text-3xl font-semibold">Tables today</h2>
      {loaded && bookings.length === 0 ? <p className="font-sans text-muted">No reservations today.</p> : null}
      <ul className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <li key={booking.id} className="menu-card flex items-center justify-between gap-4 rounded-3xl p-5">
            <div>
              <p className="font-sans font-semibold">{booking.contact_name}</p>
              <p className="font-sans text-sm text-muted">
                {booking.party} · {booking.area} · {new Date(booking.starts_at).toLocaleTimeString()} · {booking.status}
              </p>
            </div>
            {booking.status === "booked" ? (
              <button
                type="button"
                className="rounded-full px-4 py-2 font-sans text-sm"
                onClick={() =>
                  void fetch(`/backend/v1/kds/reservations/${booking.id}/no-show`, { method: "POST" }).then(() => load())
                }
              >
                No-show
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <label className="flex flex-col gap-2 font-sans text-sm">
        Cancellation reason
        <input value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-2xl border border-muted bg-transparent px-4 py-3" />
      </label>
      <p className="font-sans text-sm text-muted" role="status">
        {error}
      </p>
    </main>
  );
}
