import { cookies } from "next/headers";
import { serverApiUrl } from "@/lib/server-env";
import type { Cart } from "@/lib/cart/api";

const EMPTY: Cart = { count: 0, total: "0.00", currency: "USD", items: [] };

export async function readServerCart(): Promise<Cart> {
  try {
    const jar = await cookies();
    const cookie = jar
      .getAll()
      .map((part) => `${part.name}=${part.value}`)
      .join("; ");
    const response = await fetch(`${serverApiUrl()}/v1/cart`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) return EMPTY;
    return (await response.json()) as Cart;
  } catch {
    return EMPTY;
  }
}
