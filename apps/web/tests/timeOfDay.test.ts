import { describe, expect, it } from "vitest";
import { greetingFor, resolveTheme, resolveTimeOfDay } from "@/lib/theme/timeOfDay";

describe("time of day", () => {
  it("uses three stops and treats 19:30 as Night Decaf", () => {
    expect(resolveTimeOfDay(19, 30)).toBe("night");
    expect(resolveTimeOfDay(18, 0)).toBe("night");
    expect(resolveTimeOfDay(17, 59)).toBe("afternoon");
    expect(resolveTimeOfDay(12, 0)).toBe("afternoon");
    expect(resolveTimeOfDay(11, 59)).toBe("morning");
    expect(resolveTimeOfDay(6, 0)).toBe("morning");
    expect(resolveTimeOfDay(5, 59)).toBe("night");
  });

  it("lets a manual choice beat the clock", () => {
    const noon = resolveTheme({ manual: "dark", hour: 14, minute: 0 });
    expect(noon).toEqual({ tod: "afternoon", theme: "dark", source: "manual" });

    const auto = resolveTheme({ manual: null, hour: 19, minute: 30 });
    expect(auto).toEqual({ tod: "night", theme: "dark", source: "time" });
  });

  it("keeps the first server greeting neutral when the clock is unknown", () => {
    expect(greetingFor(null)).toBe("Freshly poured.");
    expect(greetingFor("night")).toBe("Good evening, freshly poured.");
  });
});
