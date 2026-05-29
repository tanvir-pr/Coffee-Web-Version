import { describe, expect, it } from "vitest";
import { POLL_MS, nextStage, ringOffset } from "@/lib/track/stages";

describe("order tracker", () => {
  it("fills the ring only as far as the barista has reached", () => {
    expect(nextStage("received")).toBe("grinding");
    expect(nextStage("ready")).toBe("collected");
    expect(nextStage("collected")).toBeNull();
    expect(nextStage("pending_payment")).toBeNull();
    expect(ringOffset("collected")).toBeCloseTo(0);
    expect(ringOffset("received")).toBeGreaterThan(ringOffset("ready"));
    expect(POLL_MS).toBe(15000);
  });
});
