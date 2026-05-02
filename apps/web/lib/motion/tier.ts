export type MotionTier = "full" | "lite" | "static";

export type TierSignals = {
  reducedMotion: boolean;
  reduceToggle: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  saveData?: boolean;
};

export function tierFromSignals(signals: TierSignals): MotionTier {
  if (signals.reducedMotion || signals.reduceToggle) return "static";
  const cores = signals.hardwareConcurrency;
  const memory = signals.deviceMemory;
  const lowCpu = typeof cores === "number" && cores > 0 && cores <= 4;
  const lowMem = typeof memory === "number" && memory <= 4;
  if (signals.saveData || lowCpu || lowMem) return "lite";
  return "full";
}

export function detectTier(): MotionTier {
  if (typeof window === "undefined") return "lite";
  let reduceToggle = false;
  try {
    reduceToggle = window.localStorage.getItem("crema:reduceMotion") === "1";
  } catch {
    reduceToggle = false;
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return tierFromSignals({
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    reduceToggle,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    saveData: nav.connection?.saveData === true,
  });
}

export function watchFps(onLow: () => void, min = 50): () => void {
  let frames = 0;
  let start = performance.now();
  let id = 0;
  const tick = (time: number) => {
    frames += 1;
    if (time - start > 2000) {
      if ((frames * 1000) / (time - start) < min) onLow();
      frames = 0;
      start = time;
    }
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
