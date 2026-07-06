import { NextResponse } from "next/server";
import { serverApiUrl, serverKdsToken } from "@/lib/server-env";

async function proxy(request: Request, path: string[]): Promise<NextResponse> {
  const target = new URL(`${serverApiUrl()}/${path.join("/")}`);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const idempotency = request.headers.get("idempotency-key");
  if (idempotency) headers.set("idempotency-key", idempotency);
  const lastEvent = request.headers.get("last-event-id");
  if (lastEvent) headers.set("last-event-id", lastEvent);
  if (path[0] === "v1" && path[1] === "kds") {
    headers.set("x-kds-key", serverKdsToken());
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  if (hasBody) headers.set("content-type", request.headers.get("content-type") ?? "application/json");
  const started = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7508/ingest/c4664003-c122-47c7-ac06-3ec06c45c7d4",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"a14086"},body:JSON.stringify({sessionId:"a14086",hypothesisId:"B",location:"backend/route.ts:proxy",message:"proxy throw",data:{method:request.method,target:target.toString(),ms:Date.now()-started,error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw error;
  }
  const type = upstream.headers.get("content-type");
  if (type?.includes("text/event-stream") && upstream.body) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "content-type": type, "cache-control": "no-cache", "x-accel-buffering": "no" },
    });
  }
  const payload = await upstream.arrayBuffer();
  // #region agent log
  if (upstream.status >= 400) {
    const preview = new TextDecoder().decode(payload).slice(0, 240);
    fetch("http://127.0.0.1:7508/ingest/c4664003-c122-47c7-ac06-3ec06c45c7d4",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"a14086"},body:JSON.stringify({sessionId:"a14086",hypothesisId:"A",location:"backend/route.ts:proxy",message:"proxy upstream error",data:{method:request.method,target:target.toString(),status:upstream.status,ms:Date.now()-started,preview},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
  const response = new NextResponse(payload, { status: upstream.status });
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
