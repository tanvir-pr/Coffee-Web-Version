import Link from "next/link";

export function SiteLinks() {
  return (
    <nav
      aria-label="Crema"
      className="fixed top-4 left-4 z-40 flex gap-3 rounded-full bg-surface px-4 py-2 font-sans text-sm"
    >
      <Link href="/account">Account</Link>
      <Link href="/rewards">Rewards</Link>
      <Link href="/stores">Stores</Link>
    </nav>
  );
}
