"use client";

import Link from "next/link";
import { CoffeeRipple } from "@/components/motion/could/CoffeeRipple";
import { FoamHeadline } from "@/components/motion/could/FoamHeadline";
import { OriginMap } from "@/components/motion/could/OriginMap";
import { SeasonBanner } from "@/components/motion/could/SeasonLayer";
import { SteamTrail } from "@/components/motion/could/SteamTrail";
import { SectionReveal } from "@/components/motion/should/SectionReveal";

export function StoryPage() {
  return (
    <main className="story-page mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-6 py-16">
      <CoffeeRipple />
      <Link href="/" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Home
      </Link>
      <FoamHeadline>From Sidama to the cup.</FoamHeadline>
      <SeasonBanner />

      <SectionReveal className="story-chapter">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Origin</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight">Beans with a short route.</h2>
        <p className="font-sans text-lg leading-8 text-muted">
          We buy lots that taste like chocolate, citrus, and red fruit — then roast them close enough that the
          bag still smells like the farm note on the label.
        </p>
      </SectionReveal>

      <div className="steam-zone relative min-h-48">
        <SteamTrail />
        <SectionReveal className="story-chapter border-0">
          <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Roast</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight">A roasted bean, a quiet heat.</h2>
          <p className="font-sans text-lg leading-8 text-muted">
            Small batches. Dialed for milk drinks without burying the origin. Decaf that still feels like coffee
            after dusk.
          </p>
        </SectionReveal>
      </div>

      <SectionReveal className="story-chapter">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Craft</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight">Latte art is a promise.</h2>
        <p className="font-sans text-lg leading-8 text-muted">
          Heart, leaf, or rosetta — you choose it in the builder, and the barista finishes it on the bar. The cup
          you design is the cup you collect.
        </p>
      </SectionReveal>

      <OriginMap />

      <SectionReveal className="story-chapter">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Place</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight">Riverside, then Camden.</h2>
        <p className="font-sans text-lg leading-8 text-muted">
          Counter pickup first. Hold a slot when the line looks long. Reserve a table when you want to stay.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/menu" className="inline-flex rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
            Order from the menu
          </Link>
          <Link href="/stores" className="inline-flex rounded-full px-5 py-3 font-sans text-sm underline-offset-4 hover:underline">
            See the stores
          </Link>
        </div>
      </SectionReveal>

      <footer className="pt-8 font-sans text-sm text-muted">Crema · Riverside and Camden</footer>
    </main>
  );
}
