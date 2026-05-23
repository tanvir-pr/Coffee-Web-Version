import { describe, expect, it } from "vitest";
import { ADD_MS, BADGE_PEAK, flyFrame, quad } from "@/lib/cart/fly";

describe("add to cart flight", () => {
  it("lands on the cart centre and keeps the badge inside the 600ms add", () => {
    const from = { x: 10, y: 20, width: 40, height: 40 };
    const to = { x: 300, y: 8, width: 64, height: 32 };
    const end = flyFrame(from, to, 1, 800);
    expect(end.x).toBeCloseTo(332);
    expect(end.y).toBeCloseTo(24);
    expect(end.scale).toBeCloseTo(0.4);
    expect(quad(0, 10, 20, 1)).toBe(20);
    expect(ADD_MS).toBe(600);
    expect(BADGE_PEAK).toBe(1.2);
  });
});
