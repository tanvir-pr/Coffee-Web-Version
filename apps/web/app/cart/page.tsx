import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { readServerCart } from "@/lib/cart/server";

export const metadata: Metadata = { title: "Cart · Crema" };

export default async function CartPage() {
  const initial = await readServerCart();
  return <CartView initial={initial} />;
}
