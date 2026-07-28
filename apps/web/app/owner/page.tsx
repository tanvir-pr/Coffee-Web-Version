import { redirect } from "next/navigation";
import { OwnerDesk } from "@/components/owner/OwnerDesk";
import { readServerMe } from "@/lib/auth/server";

export const metadata = { title: "Owner · Crema" };

export default async function OwnerPage() {
  const me = await readServerMe();
  if (!me) redirect("/login");
  if (me.role !== "owner") redirect("/account");
  return <OwnerDesk initialEmail={me.email} initialName={me.name} />;
}
