import { describe, expect, it } from "vitest";
import {
  HERO_TWEENS,
  buildHeroTimeline,
  clampWave,
  heroState,
  heroTimelineEnd,
  heroWavePath,
  waveAmp,
} from "@/lib/motion/hero";

describe("hero pour", () => {
  it("ends the scrub timeline at 1 and pours the streams with power1.in", () => {
    expect(heroTimelineEnd()).toBe(1);
    expect(HERO_TWEENS.find((tween) => tween.id === "stream-in")?.ease).toBe("power1.in");

    const calls: { selector: string; ease?: string; at: number; duration?: number; stagger?: number }[] = [];
    buildHeroTimeline(
      {
        fromTo: (selector, _from, to, at) => {
          calls.push({
            selector,
            at,
            ease: typeof to.ease === "string" ? to.ease : undefined,
            duration: typeof to.duration === "number" ? to.duration : undefined,
            stagger: typeof to.stagger === "number" ? to.stagger : undefined,
          });
        },
        to: (selector, to, at) => {
          calls.push({
            selector,
            at,
            ease: typeof to.ease === "string" ? to.ease : undefined,
            duration: typeof to.duration === "number" ? to.duration : undefined,
          });
        },
      },
      { art: true, desk: true },
    );

    const stream = calls.find((call) => call.selector === ".stream" && call.at === 0.05);
    expect(stream?.ease).toBe("power1.in");
    const end = Math.max(...calls.map((call) => call.at + (call.stagger ?? 0) * 2 + (call.duration ?? 0)));
    expect(end).toBe(1);
  });

  it("maps scroll progress onto the pour states", () => {
    expect(heroState(-0.01)).toBe("idle");
    expect(heroState(0)).toBe("pinned");
    expect(heroState(0.05)).toBe("pouring");
    expect(heroState(0.6)).toBe("settling");
    expect(heroState(0.66)).toBe("steaming");
    expect(heroState(0.86)).toBe("revealing");
    expect(heroState(1)).toBe("released");
  });

  it("writes a wave path and keeps the amplitude inside 6px", () => {
    expect(clampWave(12)).toBe(6);
    expect(clampWave(-9)).toBe(-6);
    expect(waveAmp(0.4, 0)).toBe(3);
    expect(waveAmp(0.4, 8000)).toBe(6);
    expect(heroWavePath(3, 0.4)).not.toBe(heroWavePath(3, 1.2));
    expect(heroWavePath(3, 0)).not.toContain("data-amp");
  });
});
