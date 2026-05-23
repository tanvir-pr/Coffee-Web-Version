import type { Recipe } from "@/lib/cup/recipe";

export type CartLine = {
  id: string;
  product_slug: string;
  name: string;
  size: string;
  milk: string;
  temp: string;
  sugar: number;
  shots: number;
  syrups: string[];
  foam: boolean;
  art: string;
  quantity: number;
  unit_price: string;
  currency: string;
};

export type Cart = {
  count: number;
  total: string;
  currency: string;
  items: CartLine[];
};

const EMPTY: Cart = { count: 0, total: "0.00", currency: "USD", items: [] };

async function parseCart(response: Response): Promise<Cart> {
  if (!response.ok) {
    throw new Error("The cart could not be updated.");
  }
  return (await response.json()) as Cart;
}

export async function fetchCart(): Promise<Cart> {
  try {
    const response = await fetch("/backend/v1/cart", { cache: "no-store" });
    if (!response.ok) return EMPTY;
    return (await response.json()) as Cart;
  } catch {
    return EMPTY;
  }
}

export async function addCartItem(slug: string, recipe: Recipe): Promise<Cart> {
  const response = await fetch("/backend/v1/cart/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      product_slug: slug,
      size: recipe.size,
      milk: recipe.milk,
      temp: recipe.temp,
      sugar: recipe.sugar,
      shots: recipe.shots,
      syrups: recipe.syrups,
      foam: recipe.foam,
      art: recipe.art,
      quantity: 1,
    }),
  });
  return parseCart(response);
}

export async function removeCartItem(id: string): Promise<Cart> {
  const response = await fetch(`/backend/v1/cart/items/${id}`, { method: "DELETE" });
  return parseCart(response);
}

export function publishCart(cart: Cart): void {
  window.dispatchEvent(new CustomEvent("crema:cart", { detail: cart }));
}
