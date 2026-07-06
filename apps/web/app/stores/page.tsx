"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionReveal } from "@/components/motion/should/SectionReveal";

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
  eta_minutes?: number;
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
    <main className="pb-16">
      <header className="place-hero">
        <Link href="/" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
          Home
        </Link>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">Stores</h1>
        <p className="mt-3 max-w-xl font-sans text-base leading-7 text-muted">
          Open hours, how busy the bar feels, and a path to pre-order or reserve.
        </p>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6">
        {stores.map((store) => (
          <SectionReveal key={store.slug}>
            <article className="menu-product-card flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-3xl font-semibold tracking-tight">{store.name}</h2>
                <span className={`choice-chip rounded-full px-3 py-1 font-sans text-xs uppercase ${store.open ? "is-pressed" : ""}`}>
                  {store.open ? "Open" : "Closed"}
                </span>
                <span className="choice-chip rounded-full px-3 py-1 font-sans text-xs uppercase">{store.busy}</span>
              </div>
              <p className="font-sans text-sm text-muted">
                {store.hours_label} · {store.prep_minutes} min prep
                {store.eta_minutes != null ? ` · about ${store.eta_minutes} min wait` : ""}
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
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href={`/preorder?store=${store.slug}`} className="rounded-full bg-primary px-4 py-2 font-sans text-sm text-on-primary">
                  Pre-order
                </Link>
                <Link href={`/reserve?store=${store.slug}`} className="rounded-full px-4 py-2 font-sans text-sm underline-offset-4 hover:underline">
                  Reserve a table
                </Link>
                {store.phone ? (
                  <a href={`tel:${store.phone}`} className="rounded-full px-4 py-2 font-sans text-sm underline-offset-4 hover:underline">
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
                  className="mt-2 h-64 w-full rounded-2xl"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(store.lng) - 0.01}%2C${Number(store.lat) - 0.01}%2C${Number(store.lng) + 0.01}%2C${Number(store.lat) + 0.01}&layer=mapnik&marker=${store.lat}%2C${store.lng}`}
                />
              ) : null}
            </article>
          </SectionReveal>
        ))}
      </div>
    </main>
  );
}
