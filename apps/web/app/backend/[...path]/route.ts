import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

async function proxy(request: Request, path: string[]): Promise<NextResponse> {
  const target = new URL(`${API_URL}/${path.join("/")}`);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const idempotency = request.headers.get("idempotency-key");
  if (idempotency) headers.set("idempotency-key", idempotency);
  const lastEvent = request.headers.get("last-event-id");
  if (lastEvent) headers.set("last-event-id", lastEvent);
  if (path[0] === "v1" && path[1] === "kds") {
    headers.set("x-kds-key", process.env.KDS_TOKEN ?? "dev-kds-token");
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  if (hasBody) headers.set("content-type", request.headers.get("content-type") ?? "application/json");
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });
  const type = upstream.headers.get("content-type");
  if (type?.includes("text/event-stream") && upstream.body) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "content-type": type, "cache-control": "no-cache", "x-accel-buffering": "no" },
    });
  }
  const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status });
  if (type) response.headers.set("content-type", type);
  for (const setCookie of upstream.headers.getSetCookie()) response.headers.append("set-cookie", setCookie);
  return response;
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
