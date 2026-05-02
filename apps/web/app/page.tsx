import { GlassSurface } from "@/components/glass/GlassSurface";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { readServerClock } from "@/lib/theme/server-clock";
import { GREETING_BOOT_SCRIPT, greetingFor, resolveTimeOfDay } from "@/lib/theme/timeOfDay";

export default async function HomePage() {
  const clock = await readServerClock();
  const tod = clock ? resolveTimeOfDay(clock.hour, clock.minute) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <GlassSurface className="w-full max-w-xl px-8 py-10 sm:px-12 sm:py-12">
        <p className="font-sans text-sm tracking-[0.18em] text-muted uppercase">Crema</p>
        <h1
          id="greeting"
          suppressHydrationWarning
          className="mt-4 font-display text-[2.5rem] leading-none font-semibold tracking-tight text-foreground sm:text-5xl"
        >
          {greetingFor(tod)}
        </h1>
        <script dangerouslySetInnerHTML={{ __html: GREETING_BOOT_SCRIPT }} />
        <p className="mt-5 max-w-md font-sans text-base leading-7 text-muted">
          Pickup, poured to order. The menu opens next. This screen is the glass, the clock, and the motion tier.
        </p>
        <ThemeControls />
      </GlassSurface>
    </main>
  );
}
