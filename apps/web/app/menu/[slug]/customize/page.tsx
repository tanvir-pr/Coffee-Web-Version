import type { Metadata } from "next";
import Link from "next/link";
import { Customizer } from "@/components/cup/Customizer";
import { fallbackMenu } from "@/lib/menu/fallback";
import { findProduct, routeSlug } from "@/lib/menu/load";
import { readServerClock } from "@/lib/theme/server-clock";
import { resolveTimeOfDay, type Tod } from "@/lib/theme/timeOfDay";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Build ${routeSlug(slug).replaceAll("-", " ")} · Crema` };
}

export default async function CustomizePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = routeSlug((await params).slug);
  const clock = await readServerClock();
  const daypart: Tod = clock ? resolveTimeOfDay(clock.hour, clock.minute) : "afternoon";
  const found = await findProduct(slug, daypart);
  const product =
    found?.product.customizable
      ? found.product
      : fallbackMenu(daypart)
          .categories.flatMap((category) => category.products)
          .find((item) => item.slug === slug && item.customizable);

  if (!product) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="font-display text-4xl font-semibold">Build unavailable</h1>
        <p className="mt-4 font-sans text-muted">That drink cannot be customized right now.</p>
        <Link href="/menu" className="mt-6 inline-flex font-sans text-sm underline">
          Back to menu
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-full items-start justify-center px-4 py-4">
      <Customizer product={product} />
    </main>
  );
}
