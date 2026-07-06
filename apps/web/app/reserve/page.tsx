"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  store_name: string;
  party: number;
  area: string;
  starts_at: string;
  cancel_token: string;
};

export default function ReservePage() {
  const [store, setStore] = useState("riverside");
  const [party, setParty] = useState(2);
  const [area, setArea] = useState("indoor");
  const [when, setWhen] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const chosen = new URLSearchParams(window.location.search).get("store");
      if (chosen) setStore(chosen);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  async function submit() {
    setError("");
    const starts = new Date(when);
    const response = await fetch("/backend/v1/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        store,
        party,
        area,
        starts_at: starts.toISOString(),
        contact_name: name,
        contact_phone: phone || null,
      }),
    });
    if (!response.ok) {
      setError("That table is not available.");
      return;
    }
    setBooking((await response.json()) as Booking);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/stores" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Stores
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Reserve</h1>
      <p className="font-sans text-base leading-7 text-muted">
        Hold a table indoors or on the terrace. One booking, one calm seat.
      </p>
      {booking ? (
        <>
          <p className="font-sans" role="status">
            {booking.store_name}, {booking.party} people, {booking.area}, {new Date(booking.starts_at).toLocaleString()}
          </p>
          <a className="font-sans text-sm" href={`/backend/v1/reservations/${booking.id}/calendar?token=${booking.cancel_token}`}>
            Add to calendar
          </a>
          <button
            type="button"
            className="w-fit font-sans text-sm text-muted"
            onClick={() =>
              void fetch(`/backend/v1/reservations/${booking.id}/cancel`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token: booking.cancel_token }),
              }).then(() => setBooking(null))
            }
          >
            Cancel reservation
          </button>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-2 font-sans text-sm">
            Store
            <select value={store} onChange={(event) => setStore(event.target.value)} className="rounded-2xl border border-muted bg-transparent px-4 py-3">
              <option value="riverside">Crema Riverside</option>
              <option value="camden">Crema Camden</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 font-sans text-sm">
            Party size
            <input type="number" min={1} max={12} value={party} onChange={(event) => setParty(Number(event.target.value))} className="rounded-2xl border border-muted bg-transparent px-4 py-3" />
          </label>
          <div className="flex gap-2" role="group" aria-label="Area">
            <button type="button" aria-pressed={area === "indoor"} className="rounded-full px-4 py-2 font-sans text-sm" onClick={() => setArea("indoor")}>
              Indoor
            </button>
            <button type="button" aria-pressed={area === "terrace"} className="rounded-full px-4 py-2 font-sans text-sm" onClick={() => setArea("terrace")}>
              Terrace
            </button>
          </div>
          <label className="flex flex-col gap-2 font-sans text-sm">
            When
            <input type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} className="rounded-2xl border border-muted bg-transparent px-4 py-3" />
          </label>
          <label className="flex flex-col gap-2 font-sans text-sm">
            Name
            <input required value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-muted bg-transparent px-4 py-3" />
          </label>
          <label className="flex flex-col gap-2 font-sans text-sm">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-2xl border border-muted bg-transparent px-4 py-3" />
          </label>
          <button type="submit" className="w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
            Confirm table
          </button>
        </form>
      )}
      {error ? (
        <p className="font-sans text-sm text-muted" role="status">
          {error}
        </p>
      ) : null}
    </main>
  );
}
