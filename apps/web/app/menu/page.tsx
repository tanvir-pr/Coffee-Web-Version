import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { menuJsonLd, orderMenu, type Daypart } from "@/lib/menu/menu";
import { fetchMenu } from "@/lib/menu/load";
import { readServerClock } from "@/lib/theme/server-clock";
import { resolveTimeOfDay } from "@/lib/theme/timeOfDay";
import { MenuBrowser } from "@/components/menu/MenuBrowser";

export const metadata: Metadata = { title: "Menu · Crema" };

export default async function MenuPage() {
  const clock = await readServerClock();
  const daypart: Daypart = clock ? resolveTimeOfDay(clock.hour, clock.minute) : "afternoon";
  const menu = orderMenu(await fetchMenu(daypart), daypart);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const jsonLd = menuJsonLd(menu, `${proto}://${host}`);

  return (
    <main>
      <Script id="menu-jsonld" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MenuBrowser menu={menu} daypart={daypart} />
    </main>
  );
}
