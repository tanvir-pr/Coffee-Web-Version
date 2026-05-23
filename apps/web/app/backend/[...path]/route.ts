import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

async function proxy(request: Request, path: string[]): Promise<NextResponse> {
  const target = new URL(`${API_URL}/${path.join("/")}`);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  if (hasBody) headers.set("content-type", request.headers.get("content-type") ?? "application/json");
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });
  const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status });
  const type = upstream.headers.get("content-type");
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
