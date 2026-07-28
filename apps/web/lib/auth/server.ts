import { cookies } from "next/headers";
import { serverApiUrl } from "@/lib/server-env";

export type SessionUser = { email: string; name: string; role: string };

export async function readServerMe(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const cookie = jar
      .getAll()
      .map((part) => `${part.name}=${part.value}`)
      .join("; ");
    if (!cookie) return null;
    const response = await fetch(`${serverApiUrl()}/v1/me`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as SessionUser;
  } catch {
    return null;
  }
}
