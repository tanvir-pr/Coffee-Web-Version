"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteFooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return children;
}
