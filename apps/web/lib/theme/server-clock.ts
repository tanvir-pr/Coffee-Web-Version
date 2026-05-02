import { cookies } from "next/headers";
import { TZ_COOKIE } from "@/lib/theme/timeOfDay";

export async function readServerClock(): Promise<{ hour: number; minute: number } | null> {
  const jar = await cookies();
  const tz = jar.get(TZ_COOKIE)?.value;
  if (!tz) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return { hour, minute };
  } catch {
    return null;
  }
}
