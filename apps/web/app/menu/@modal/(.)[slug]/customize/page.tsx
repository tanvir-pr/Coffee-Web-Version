import { notFound } from "next/navigation";
import { Customizer } from "@/components/cup/Customizer";
import { findProduct } from "@/lib/menu/load";
import { readServerClock } from "@/lib/theme/server-clock";
import { resolveTimeOfDay, type Tod } from "@/lib/theme/timeOfDay";

export default async function CustomizeModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clock = await readServerClock();
  const daypart: Tod = clock ? resolveTimeOfDay(clock.hour, clock.minute) : "afternoon";
  const found = await findProduct(slug, daypart);
  if (!found?.product.customizable) notFound();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 pt-20 sm:items-center">
      <div className="absolute inset-0 bg-[rgba(20,14,11,0.72)]" />
      <div role="dialog" aria-modal="true" aria-labelledby="customizer-title" className="relative z-10 w-full min-w-0 max-w-4xl">
        <Customizer product={found.product} />
      </div>
    </div>
  );
}
