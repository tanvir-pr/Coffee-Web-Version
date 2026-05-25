import type { Metadata } from "next";
import { OrderReceipt } from "@/components/checkout/OrderReceipt";

export const metadata: Metadata = { title: "Order · Crema" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderReceipt orderId={id} />;
}
