"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Loyalty = {
  stamps: number;
  stamps_goal: number;
  beans: number;
  tier_label: string;
  rewards: number;
  stamps_until_reward: number;
};

export default function RewardsPage() {
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetch("/backend/v1/me/loyalty", { cache: "no-store" }).then(async (response) => {
        if (response.status === 401) {
          setSignedOut(true);
          return;
        }
        if (response.ok) setLoyalty((await response.json()) as Loyalty);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/account" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Account
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Rewards</h1>
      {signedOut ? (
        <p className="font-sans text-muted">
          <Link href="/account">Sign in</Link> to collect stamps.
        </p>
      ) : null}
      {loyalty ? (
        <>
          <p className="font-sans text-muted">{loyalty.tier_label}</p>
          <p className="font-mono text-3xl">{loyalty.beans} beans</p>
          <p className="font-sans">
            {loyalty.stamps_until_reward} more {loyalty.stamps_until_reward === 1 ? "stamp" : "stamps"} toward a free drink
          </p>
          <ol className="flex flex-wrap gap-3" aria-label="Stamp card">
            {Array.from({ length: loyalty.stamps_goal }, (_, index) => {
              const filled = index < loyalty.stamps;
              const fresh = filled && index === loyalty.stamps - 1;
              return (
                <li
                  key={index}
                  className={fresh ? "stamp stamp-fresh" : "stamp"}
                  data-filled={filled}
                  aria-label={filled ? `Stamp ${index + 1}, filled` : `Stamp ${index + 1}, empty`}
                />
              );
            })}
          </ol>
          {loyalty.rewards > 0 ? (
            <button
              type="button"
              className="w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary"
              onClick={() =>
                void fetch("/backend/v1/me/loyalty/redeem", { method: "POST" }).then(() => {
                  window.location.reload();
                })
              }
            >
              Redeem a free drink
            </button>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
