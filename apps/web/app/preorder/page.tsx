"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Slot = { start: string; remaining: number };

function upcomingDays(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + offset);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export default function PreorderPage() {
  const [store, setStore] = useState("riverside");
  const [day, setDay] = useState(upcomingDays()[0] ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [held, setHeld] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const chosen = new URLSearchParams(window.location.search).get("store");
      if (chosen) setStore(chosen);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!day) return;
    const frame = requestAnimationFrame(() => {
      void fetch(`/backend/v1/stores/${store}/slots?day=${day}`, { cache: "no-store" }).then(async (response) => {
        if (response.ok) {
          const body = (await response.json()) as { slots: Slot[] };
          setSlots(body.slots);
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [store, day]);

  async function hold(start: string) {
    const response = await fetch(`/backend/v1/stores/${store}/slots/hold`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ start }),
    });
    if (!response.ok) return;
    window.sessionStorage.setItem("crema:slot", start);
    setHeld(start);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/stores" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Stores
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Pre-order</h1>
      <label className="flex flex-col gap-2 font-sans text-sm">
        Store
        <select value={store} onChange={(event) => setStore(event.target.value)} className="rounded-2xl border border-muted bg-transparent px-4 py-3">
          <option value="riverside">Crema Riverside</option>
          <option value="camden">Crema Camden</option>
        </select>
      </label>
      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Date">
        {upcomingDays().map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === day}
            className="rounded-full px-4 py-2 font-sans text-sm"
            onClick={() => setDay(value)}
          >
            {value.slice(5)}
          </button>
        ))}
      </div>
      <ul className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <li key={slot.start}>
            <button
              type="button"
              disabled={slot.remaining < 1}
              className="rounded-full border border-muted px-4 py-2 font-mono text-sm disabled:opacity-40"
              onClick={() => void hold(slot.start)}
            >
              {new Date(slot.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </button>
          </li>
        ))}
      </ul>
      {held ? (
        <p className="font-sans" role="status">
          Held for 5 minutes. <Link href="/menu">Choose drinks</Link>, then checkout.
        </p>
      ) : null}
    </main>
  );
}
