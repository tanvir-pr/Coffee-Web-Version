import { describe, expect, it } from "vitest";
import { LOADER_DELAY_MS, LOADER_LOOP_MS, loaderVariant, shouldShowLoader } from "@/lib/motion/loader";

describe("latte loader", () => {
  it("stays hidden under 300ms and holds for 500ms once shown", () => {
    expect(LOADER_DELAY_MS).toBe(300);
    expect(shouldShowLoader(true, 299, null)).toBe(false);
    expect(shouldShowLoader(true, 300, null)).toBe(true);
    expect(shouldShowLoader(false, 0, null)).toBe(false);
    expect(shouldShowLoader(false, 0, 499)).toBe(true);
    expect(shouldShowLoader(false, 0, 500)).toBe(false);
    expect(loaderVariant(LOADER_LOOP_MS * 3 - 1)).toBe("heart");
    expect(loaderVariant(LOADER_LOOP_MS * 3)).toBe("rosetta");
  });
});
