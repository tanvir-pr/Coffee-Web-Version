import Link from "next/link";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/stores", label: "Stores" },
  { href: "/story", label: "Our story" },
  { href: "/rewards", label: "Rewards" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight">Crema</p>
          <p className="mt-2 max-w-xs font-sans text-sm leading-6 text-muted">
            Poured to order. Collected at the counter.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="site-footer-links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="font-sans text-sm text-muted">
          <span className="site-hours">Open 7:00–19:00</span>
        </p>
      </div>
    </footer>
  );
}
