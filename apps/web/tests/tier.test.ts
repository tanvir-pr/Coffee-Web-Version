import { describe, expect, it } from "vitest";
import { tierFromSignals } from "@/lib/motion/tier";

describe("motion tier", () => {
  it("returns static for reduced motion and the in-app toggle", () => {
    expect(
      tierFromSignals({
        reducedMotion: true,
        reduceToggle: false,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }),
    ).toBe("static");
    expect(
      tierFromSignals({
        reducedMotion: false,
        reduceToggle: true,
        hardwareConcurrency: 8,
        deviceMemory: 8,
      }),
    ).toBe("static");
  });

  it("follows the UI hardware gate and ignores a missing deviceMemory", () => {
    expect(
      tierFromSignals({
        reducedMotion: false,
        reduceToggle: false,
        hardwareConcurrency: 4,
        deviceMemory: 8,
      }),
    ).toBe("lite");
    expect(
      tierFromSignals({
        reducedMotion: false,
        reduceToggle: false,
        hardwareConcurrency: 8,
      }),
    ).toBe("full");
    expect(
      tierFromSignals({
        reducedMotion: false,
        reduceToggle: false,
        hardwareConcurrency: 5,
        deviceMemory: 8,
      }),
    ).toBe("full");
    expect(
      tierFromSignals({
        reducedMotion: false,
        reduceToggle: false,
        hardwareConcurrency: 8,
        deviceMemory: 4,
      }),
    ).toBe("lite");
    expect(
      tierFromSignals({
        reducedMotion: false,
        reduceToggle: false,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        saveData: true,
      }),
    ).toBe("lite");
  });
});
