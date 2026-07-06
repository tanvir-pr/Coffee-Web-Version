"use client";

import Link from "next/link";
import { SectionReveal } from "@/components/motion/should/SectionReveal";
import { DAYPART_COPY } from "@/lib/motion/reveal";
import type { Daypart } from "@/lib/menu/menu";

export function HomeBelow({ daypart }: { daypart: Daypart | null }) {
  const day = DAYPART_COPY[daypart ?? "afternoon"];

  return (
    <div className="home-below">
      <SectionReveal className="home-band">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">{day.title}</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          The counter shifts with the light.
        </h2>
        <p className="mt-4 max-w-xl font-sans text-base leading-7 text-muted">{day.line}</p>
        <Link href="/menu" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
          Browse today’s menu
        </Link>
      </SectionReveal>

      <SectionReveal className="home-band">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Build</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Tune the cup before it hits the bar.
        </h2>
        <p className="mt-4 max-w-xl font-sans text-base leading-7 text-muted">
          Size, milk, foam, and latte art — then send it flying to your cart.
        </p>
        <Link href="/menu/matcha-latte/customize" className="mt-6 inline-flex rounded-full px-5 py-3 font-sans text-sm text-foreground underline-offset-4 hover:underline">
          Start with a Matcha Latte
        </Link>
      </SectionReveal>

      <SectionReveal className="home-band">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Pickup</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Riverside first. Camden when you wander.
        </h2>
        <p className="mt-4 max-w-xl font-sans text-base leading-7 text-muted">
          See open hours, how busy the bar is, and hold a slot before you pour.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/stores" className="inline-flex rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
            Find a store
          </Link>
          <Link href="/preorder" className="inline-flex rounded-full px-5 py-3 font-sans text-sm text-foreground underline-offset-4 hover:underline">
            Hold a pickup slot
          </Link>
        </div>
      </SectionReveal>

      <SectionReveal className="home-band">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Rewards</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Ten stamps. One free drink.
        </h2>
        <p className="mt-4 max-w-xl font-sans text-base leading-7 text-muted">
          Beans climb with every collected cup. Sign in with a magic link — no password.
        </p>
        <Link href="/rewards" className="mt-6 inline-flex rounded-full px-5 py-3 font-sans text-sm text-foreground underline-offset-4 hover:underline">
          See your stamp card
        </Link>
      </SectionReveal>

      <footer className="home-band border-t border-[var(--crema-rim)]">
        <p className="font-display text-2xl font-semibold tracking-tight">Crema</p>
        <p className="mt-2 font-sans text-sm text-muted">Poured to order. Collected at the counter.</p>
      </footer>
    </div>
  );
}
