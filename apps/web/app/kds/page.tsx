import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KdsBoard } from "@/components/kds/KdsBoard";
import { readServerMe } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Barista · Crema" };

export default async function KdsPage() {
  const me = await readServerMe();
  if (!me) redirect("/login");
  if (me.role !== "owner") redirect("/account");
  return <KdsBoard />;
}
