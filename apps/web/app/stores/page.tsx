"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StoreCard = {
  slug: string;
  name: string;
  address: string;
  phone: string;
  lat: string | null;
  lng: string | null;
  prep_minutes: number;
  open: boolean;
  hours_label: string;
  busy: string;
  amenities: string[];
  hours: { weekday: number; opens: string; closes: string; closed: boolean }[];
  exceptions: { date: string; label: string; opens: string | null; closes: string | null; closed: boolean }[];
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StoresPage() {
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [map, setMap] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetch("/backend/v1/stores", { cache: "no-store" }).then(async (response) => {
        if (response.ok) setStores((await response.json()) as StoreCard[]);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Home
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Stores</h1>
      {stores.map((store) => (
        <article key={store.slug} className="menu-card flex flex-col gap-3 rounded-3xl p-5">
          <h2 className="font-sans text-xl font-semibold">{store.name}</h2>
          <p className="font-sans">
            {store.hours_label} · {store.prep_minutes} min prep · {store.busy}
          </p>
          <p className="font-sans text-sm text-muted">{store.address}</p>
          <p className="font-sans text-sm text-muted">{store.amenities.join(" · ")}</p>
          <table className="font-sans text-sm">
            <tbody>
              {store.hours.map((row) => (
                <tr key={row.weekday}>
                  <th className="pr-4 text-left font-normal">{DAYS[row.weekday]}</th>
                  <td>{row.closed ? "Closed" : `${row.opens}–${row.closes}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {store.exceptions.map((row) => (
            <p key={row.date} className="font-sans text-sm text-muted">
              {row.label}: {row.date} {row.closed ? "closed" : `${row.opens}–${row.closes}`}
            </p>
          ))}
          <div className="flex flex-wrap gap-3">
            <Link href={`/preorder?store=${store.slug}`} className="rounded-full bg-primary px-4 py-2 font-sans text-sm text-on-primary">
              Pre-order
            </Link>
            <Link href={`/reserve?store=${store.slug}`} className="rounded-full px-4 py-2 font-sans text-sm">
              Reserve a table
            </Link>
            {store.phone ? (
              <a href={`tel:${store.phone}`} className="rounded-full px-4 py-2 font-sans text-sm">
                Call
              </a>
            ) : null}
            {store.lat && store.lng ? (
              <button type="button" className="rounded-full px-4 py-2 font-sans text-sm" onClick={() => setMap(map === store.slug ? null : store.slug)}>
                {map === store.slug ? "Hide map" : "Show map"}
              </button>
            ) : null}
          </div>
          {map === store.slug && store.lat && store.lng ? (
            <iframe
              title={`Map of ${store.name}`}
              className="h-64 w-full rounded-2xl"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(store.lng) - 0.01}%2C${Number(store.lat) - 0.01}%2C${Number(store.lng) + 0.01}%2C${Number(store.lat) + 0.01}&layer=mapnik&marker=${store.lat}%2C${store.lng}`}
            />
          ) : null}
        </article>
      ))}
    </main>
  );
}
