import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/menu/ProductDetail";
import { findProduct, routeSlug } from "@/lib/menu/load";
import { readServerClock } from "@/lib/theme/server-clock";
import { resolveTimeOfDay, type Tod } from "@/lib/theme/timeOfDay";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${routeSlug(slug).replaceAll("-", " ")} · Crema` };
}

export default async function MenuItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clock = await readServerClock();
  const daypart: Tod = clock ? resolveTimeOfDay(clock.hour, clock.minute) : "afternoon";
  const found = await findProduct(slug, daypart);
  if (!found) notFound();
  const { menu, product } = found;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: product.name,
    description: product.description,
    offers: { "@type": "Offer", price: product.price, priceCurrency: product.currency },
  };

  return (
    <>
      <Script
        id={`menu-item-${product.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail menu={menu} product={product} />
    </>
  );
}
