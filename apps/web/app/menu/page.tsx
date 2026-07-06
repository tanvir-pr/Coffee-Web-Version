import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { menuJsonLd, orderMenu, type Daypart, type Menu } from "@/lib/menu/menu";
import { readServerClock } from "@/lib/theme/server-clock";
import { resolveTimeOfDay } from "@/lib/theme/timeOfDay";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { serverApiUrl } from "@/lib/server-env";

export const metadata: Metadata = { title: "Menu · Crema" };

async function loadMenu(daypart: Daypart): Promise<Menu | null> {
  try {
    const response = await fetch(`${serverApiUrl()}/v1/menu?store=riverside&daypart=${daypart}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as Menu;
  } catch {
    return null;
  }
}

export default async function MenuPage() {
  const clock = await readServerClock();
  const daypart: Daypart = clock ? resolveTimeOfDay(clock.hour, clock.minute) : "afternoon";
  const menu = await loadMenu(daypart);
  if (!menu) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="font-display text-4xl font-semibold">Menu</h1>
        <p className="mt-4 font-sans text-muted">The menu is unavailable right now. Check that the API is running.</p>
      </main>
    );
  }
  const ordered = orderMenu(menu, daypart);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const jsonLd = menuJsonLd(ordered, `${proto}://${host}`);

  return (
    <main>
      <Script id="menu-jsonld" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MenuBrowser menu={ordered} daypart={daypart} />
    </main>
  );
}
