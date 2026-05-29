import type { Metadata } from "next";
import { KdsBoard } from "@/components/kds/KdsBoard";

export const metadata: Metadata = { title: "Barista · Crema" };

export default function KdsPage() {
  return <KdsBoard />;
}
