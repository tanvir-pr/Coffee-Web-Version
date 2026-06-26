import Link from "next/link";
import { CafeSound } from "@/components/motion/could/CafeSound";

export function SiteLinks() {
  return (
    <nav
      aria-label="Crema"
      className="fixed top-4 left-4 z-40 flex max-w-[calc(100vw-6rem)] flex-wrap items-center gap-3 rounded-full bg-surface px-4 py-2 font-sans text-sm"
    >
      <Link href="/account">Account</Link>
      <Link href="/rewards">Rewards</Link>
      <Link href="/stores">Stores</Link>
      <Link href="/story">Story</Link>
      <CafeSound />
    </nav>
  );
}
