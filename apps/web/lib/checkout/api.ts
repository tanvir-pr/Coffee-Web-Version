export type Quote = {
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  tax_rate: string;
  prep_minutes: number;
  store_name: string;
  items: { name: string; quantity: number; unit_price: string }[];
};

export type PlacedOrder = {
  id: string;
  code: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  contact_name: string;
  prep_minutes: number | null;
  provider: string | null;
  client_secret: string | null;
  items: { name: string; size: string; milk: string; temp: string; quantity: number; unit_price: string }[];
};

async function problem(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; title?: string };
    return body.detail || body.title || "Checkout could not be completed.";
  } catch {
    return "Checkout could not be completed.";
  }
}

export async function fetchQuote(): Promise<Quote | null> {
  const response = await fetch("/backend/v1/checkout/quote", { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as Quote;
}

export async function placeOrder(input: {
  paymentMethod: "card" | "cash";
  name: string;
  phone: string;
}): Promise<PlacedOrder> {
  const response = await fetch("/backend/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": crypto.randomUUID().replaceAll("-", ""),
    },
    body: JSON.stringify({
      store: "riverside",
      fulfilment: "pickup",
      payment_method: input.paymentMethod,
      contact_name: input.name,
      contact_phone: input.phone || null,
    }),
  });
  if (!response.ok) throw new Error(await problem(response));
  return (await response.json()) as PlacedOrder;
}

export async function confirmDevPayment(orderId: string): Promise<PlacedOrder> {
  const response = await fetch(`/backend/v1/orders/${orderId}/confirm-dev`, { method: "POST" });
  if (!response.ok) throw new Error(await problem(response));
  return (await response.json()) as PlacedOrder;
}

export async function fetchOrder(orderId: string): Promise<PlacedOrder | null> {
  const response = await fetch(`/backend/v1/orders/${orderId}`, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as PlacedOrder;
}
