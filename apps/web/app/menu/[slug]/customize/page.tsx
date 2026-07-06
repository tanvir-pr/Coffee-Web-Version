import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Customizer } from "@/components/cup/Customizer";
import { findProduct, routeSlug } from "@/lib/menu/load";
import { readServerClock } from "@/lib/theme/server-clock";
import { resolveTimeOfDay, type Tod } from "@/lib/theme/timeOfDay";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Build ${routeSlug(slug).replaceAll("-", " ")} · Crema` };
}

export default async function CustomizePage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await loadCustomProduct((await params).slug);
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-full items-start justify-center px-4 py-4">
      <Customizer product={product} />
    </main>
  );
}

async function loadCustomProduct(slug: string) {
  const clock = await readServerClock();
  const daypart: Tod = clock ? resolveTimeOfDay(clock.hour, clock.minute) : "afternoon";
  const found = await findProduct(slug, daypart);
  if (!found?.product.customizable) notFound();
  return found.product;
}
