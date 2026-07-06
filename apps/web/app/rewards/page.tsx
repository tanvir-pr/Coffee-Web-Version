"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PourRefresh } from "@/components/motion/could/PourRefresh";

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

  const load = useCallback(async () => {
    const response = await fetch("/backend/v1/me/loyalty", { cache: "no-store" });
    if (response.status === 401) {
      setSignedOut(true);
      return;
    }
    if (response.ok) setLoyalty((await response.json()) as Loyalty);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
  }, [load]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/account" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Account
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Rewards</h1>
      {signedOut ? (
        <div className="flow-empty menu-product-card">
          <p className="font-display text-3xl font-semibold tracking-tight">Ten stamps. One free drink.</p>
          <p className="mt-3 font-sans text-base leading-7 text-muted">
            Beans climb when your order is collected. Sign in with a magic link — no password.
          </p>
          <Link href="/account" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
            Sign in for stamps
          </Link>
        </div>
      ) : null}
      <PourRefresh onRefresh={load}>
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
            <div className="flex flex-col gap-3">
              <p className="font-sans text-sm text-muted">
                You have {loyalty.rewards} free {loyalty.rewards === 1 ? "drink" : "drinks"} ready. Apply one at checkout.
              </p>
              <Link href="/menu" className="w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
                Order and apply reward
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
      </PourRefresh>
    </main>
  );
}
