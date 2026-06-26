"use client";

import Link from "next/link";
import { CoffeeRipple } from "@/components/motion/could/CoffeeRipple";
import { FoamHeadline } from "@/components/motion/could/FoamHeadline";
import { OriginMap } from "@/components/motion/could/OriginMap";
import { SeasonBanner } from "@/components/motion/could/SeasonLayer";
import { SteamTrail } from "@/components/motion/could/SteamTrail";

export function StoryPage() {
  return (
    <main className="story-page mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <CoffeeRipple />
      <Link href="/" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Home
      </Link>
      <FoamHeadline>From Sidama to the cup.</FoamHeadline>
      <SeasonBanner />
      <div className="steam-zone relative min-h-48">
        <SteamTrail />
        <p className="font-sans text-lg text-muted">A roasted bean, a short route, and a cup poured at the counter.</p>
      </div>
      <OriginMap />
      <footer className="font-sans text-sm text-muted">Crema · Riverside and Camden</footer>
    </main>
  );
}
