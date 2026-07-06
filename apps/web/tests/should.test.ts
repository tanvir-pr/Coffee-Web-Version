import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/motion/could";
import { CATEGORY_STYLE, holdFinished, magnetOffset, receiptLines, receiptPdf, ritualMs } from "@/lib/motion/should";

describe("should animations", () => {
  it("keeps the page ritual short and the magnet inside 8px", () => {
    expect(ritualMs("full")).toBeLessThan(900);
    expect(ritualMs("lite")).toBeLessThanOrEqual(400);
    expect(ritualMs("static")).toBe(150);
    expect(magnetOffset(100)).toBe(8);
    expect(magnetOffset(-100)).toBe(-8);
    expect(holdFinished(1199)).toBe(false);
    expect(holdFinished(1200)).toBe(true);
  });

  it("keeps category labels readable on every drink colour", () => {
    for (const style of Object.values(CATEGORY_STYLE)) {
      expect(contrastRatio(style.ink, style.fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("prints the pickup code as text and as a PDF", () => {
    const lines = receiptLines({
      code: "D7B774DC",
      subtotal: "5.90",
      tax: "0.47",
      total: "6.37",
      items: [{ quantity: 1, name: "Matcha Latte", unit_price: "5.90" }],
    });
    expect(lines.join("\n")).toContain("Pickup  D7B774DC");
    const pdf = new TextDecoder().decode(receiptPdf(lines));
    expect(pdf.startsWith("%PDF-1.1")).toBe(true);
    expect(pdf).toContain("Pickup  D7B774DC");
  });
});
