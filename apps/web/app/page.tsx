import Link from "next/link";
import { HeroShell } from "@/components/motion/hero/HeroShell";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { readServerClock } from "@/lib/theme/server-clock";
import { GREETING_BOOT_SCRIPT, greetingFor, resolveTimeOfDay } from "@/lib/theme/timeOfDay";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ debug?: string }> }) {
  const clock = await readServerClock();
  const tod = clock ? resolveTimeOfDay(clock.hour, clock.minute) : null;
  const query = await searchParams;

  return (
    <main>
      <HeroShell debug={query.debug === "motion"}>
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Crema</p>
        <h1
          id="greeting"
          suppressHydrationWarning
          className="mt-4 font-display text-[2.5rem] leading-none font-semibold tracking-tight text-foreground sm:text-5xl"
        >
          {greetingFor(tod)}
        </h1>
        <p className="mt-5 max-w-md font-sans text-base leading-7 text-muted">
          Pickup, poured to order. Browse the counter, then build the cup.
        </p>
        <Link
          href="/menu"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary"
        >
          View menu
        </Link>
        <ThemeControls />
      </HeroShell>
      <script dangerouslySetInnerHTML={{ __html: GREETING_BOOT_SCRIPT }} />
    </main>
  );
}
