import { describe, expect, it } from "vitest";
import {
  FOAM_INK,
  FOAM_PANEL,
  canSpawnSteam,
  clampPitch,
  contrastRatio,
  dragYaw,
  dropScale,
  flagOn,
  particleCount,
  previewIds,
  rippleAllowed,
  shouldRefresh,
  tiltTarget,
} from "@/lib/motion/could";

describe("could-animation flags", () => {
  it("keeps could animations off unless the remote flag or a preview asks", () => {
    const preview = previewIds("06,16,nope");
    expect(preview.has("06")).toBe(true);
    expect(preview.has("16")).toBe(true);
    expect(preview.has("07")).toBe(false);
    expect(flagOn("06", { "06": false }, preview, false)).toBe(true);
    expect(flagOn("07", { "07": true }, new Set(), false)).toBe(true);
    expect(flagOn("07", { "07": true }, preview, true)).toBe(false);
    expect(previewIds("all").size).toBe(9);
  });

  it("refreshes only past 72px at the top of the list", () => {
    expect(dropScale(36)).toBeCloseTo(0.5);
    expect(dropScale(72)).toBe(1);
    expect(shouldRefresh(72, true)).toBe(false);
    expect(shouldRefresh(73, true)).toBe(true);
    expect(shouldRefresh(90, false)).toBe(false);
  });

  it("limits steam, ripples, tilt, and seasonal counts", () => {
    expect(canSpawnSteam(29, 0, false)).toBe(false);
    expect(canSpawnSteam(30, 39, false)).toBe(true);
    expect(canSpawnSteam(30, 20, true)).toBe(false);
    expect(rippleAllowed(true, "", 0)).toBe(false);
    expect(rippleAllowed(false, "selected", 0)).toBe(false);
    expect(rippleAllowed(false, "", 3)).toBe(false);
    expect(rippleAllowed(false, "", 2, 1)).toBe(false);
    expect(rippleAllowed(false, "", 0)).toBe(true);
    expect(tiltTarget(18)).toBe(-18);
    expect(tiltTarget(40)).toBe(-30);
    expect(tiltTarget(null)).toBe(0);
    expect(clampPitch(20)).toBe(15);
    expect(dragYaw(1)).toBeCloseTo((0.6 * Math.PI) / 180);
    expect(particleCount("autumn", "static", false)).toBe(0);
    expect(particleCount("spring", "lite", false)).toBe(10);
    expect(particleCount("autumn", "full", true)).toBe(18);
    expect(particleCount("spring", "full", false)).toBe(24);
  });

  it("keeps foam ink readable on the crema panel", () => {
    expect(contrastRatio(FOAM_INK, FOAM_PANEL)).toBeGreaterThanOrEqual(4.5);
  });
});
