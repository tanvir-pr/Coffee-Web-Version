#!/usr/bin/env node
/**
 * Local end-to-end audit: customer order + owner desk/KDS.
 * Usage: node scripts/audit-flow.mjs
 */
const API = process.env.API_URL ?? "http://127.0.0.1:8000";
const WEB = process.env.WEB_URL ?? "http://127.0.0.1:3000";

function cookieJar() {
  const jar = new Map();
  return {
    store(response) {
      const raw = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
      for (const line of raw) {
        const [pair] = line.split(";");
        const idx = pair.indexOf("=");
        if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function req(base, path, { method = "GET", body, jar, headers = {} } = {}) {
  const nextHeaders = { ...headers };
  if (jar) nextHeaders.cookie = jar.header();
  if (body !== undefined) nextHeaders["content-type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers: nextHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (jar) jar.store(response);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function main() {
  const guest = cookieJar();
  const owner = cookieJar();
  const steps = [];

  const health = await req(API, "/health");
  assert(health.status === 200, `API health ${health.status}`);
  steps.push("api health ok");

  const webHome = await fetch(`${WEB}/`);
  assert(webHome.status === 200, `web home ${webHome.status}`);
  steps.push("web home ok");

  for (const path of ["/menu", "/login", "/cart", "/checkout", "/owner", "/kds", "/rewards", "/stores"]) {
    const page = await fetch(`${WEB}${path}`);
    assert(page.status === 200, `web ${path} ${page.status}`);
  }
  steps.push("core pages 200");

  const loginGuest = await req(API, "/v1/auth/login", {
    method: "POST",
    jar: guest,
    body: { email: "guest@crema.local", password: "CremaGuest1!" },
  });
  assert(loginGuest.status === 200, `guest login ${loginGuest.status}`);
  assert(loginGuest.json?.role === "customer", "guest role missing");
  steps.push("guest login ok");

  const add = await req(API, "/v1/cart/items", {
    method: "POST",
    jar: guest,
    body: {
      product_slug: "matcha-latte",
      size: "M",
      milk: "oat",
      temp: "hot",
      sugar: 0,
      shots: 1,
      syrups: [],
      foam: true,
      art: "leaf",
      quantity: 1,
    },
  });
  assert(add.status === 200 && add.json?.count >= 1, `add cart ${add.status}`);
  steps.push(`cart count ${add.json.count}`);

  const quote = await req(API, "/v1/checkout/quote", { jar: guest });
  assert(quote.status === 200 && quote.json?.items?.length, `quote ${quote.status}`);
  steps.push(`quote total ${quote.json.total}`);

  const placed = await req(API, "/v1/orders", {
    method: "POST",
    jar: guest,
    headers: { "idempotency-key": `audit${Date.now()}` },
    body: {
      store: "riverside",
      fulfilment: "pickup",
      payment_method: "cash",
      contact_name: "Maya Guest",
      contact_phone: "+10000000000",
      apply_reward: false,
    },
  });
  assert(placed.status === 200 || placed.status === 201, `place order ${placed.status} ${JSON.stringify(placed.json)}`);
  const orderId = placed.json?.id;
  assert(orderId, "order id missing");
  steps.push(`order ${placed.json.code} ${placed.json.status}`);

  if (placed.json?.provider === "dev") {
    const paid = await req(API, `/v1/orders/${orderId}/confirm-dev`, {
      method: "POST",
      jar: guest,
    });
    assert(paid.status === 200, `confirm-dev ${paid.status}`);
    steps.push(`paid ${paid.json.status}`);
  } else {
    steps.push(`cash order ready as ${placed.json.status}`);
  }

  const loginOwner = await req(API, "/v1/auth/login", {
    method: "POST",
    jar: owner,
    body: { email: "owner@crema.local", password: "CremaOwner1!" },
  });
  assert(loginOwner.status === 200 && loginOwner.json?.role === "owner", `owner login ${loginOwner.status}`);
  steps.push("owner login ok");

  const overview = await req(API, "/v1/owner/overview", { jar: owner });
  assert(overview.status === 200, `owner overview ${overview.status}`);
  steps.push(`owner open_orders ${overview.json.open_orders}`);

  const kds = await fetch(`${API}/v1/kds/orders?store=riverside`, {
    headers: { "x-kds-key": "dev-kds-token", cookie: owner.header() },
  });
  const kdsBody = await kds.json();
  assert(kds.status === 200, `kds ${kds.status}`);
  const ticket = kdsBody.find((row) => row.id === orderId) ?? kdsBody[0];
  assert(ticket, "no kds ticket");
  steps.push(`kds ticket ${ticket.code} ${ticket.status}`);

  const FLOW = ["received", "grinding", "brewing", "steaming", "ready", "collected"];
  const at = FLOW.indexOf(ticket.status);
  const next = at >= 0 && at + 1 < FLOW.length ? FLOW[at + 1] : null;
  if (next) {
    const moved = await fetch(`${API}/v1/kds/orders/${ticket.id}/transition`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kds-key": "dev-kds-token",
        cookie: owner.header(),
      },
      body: JSON.stringify({ status: next, reason: null }),
    });
    const movedBody = await moved.json();
    assert(moved.status === 200, `transition ${moved.status} ${JSON.stringify(movedBody)}`);
    steps.push(`advanced to ${movedBody.status}`);
  }

  const forbidden = await req(API, "/v1/owner/overview", { jar: guest });
  assert(forbidden.status === 403, `customer blocked from owner ${forbidden.status}`);
  steps.push("customer blocked from owner");

  console.log("AUDIT OK");
  for (const step of steps) console.log(` - ${step}`);
}

main().catch((error) => {
  console.error("AUDIT FAIL", error.message);
  process.exit(1);
});
