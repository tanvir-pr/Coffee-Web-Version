export const STAGES = ["received", "grinding", "brewing", "steaming", "ready", "collected"] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  received: "Received",
  grinding: "Grinding",
  brewing: "Brewing",
  steaming: "Steaming",
  ready: "Ready",
  collected: "Collected",
};

const FILL: Record<Stage, number> = {
  received: 1 / 6,
  grinding: 2 / 6,
  brewing: 3 / 6,
  steaming: 4 / 6,
  ready: 5 / 6,
  collected: 1,
};

export const POLL_MS = 15000;

export function nextStage(status: string): Stage | null {
  const index = STAGES.indexOf(status as Stage);
  if (index < 0 || index + 1 >= STAGES.length) return null;
  return STAGES[index + 1] ?? null;
}

export function ringOffset(status: string, radius = 46): number {
  const fill = status in FILL ? FILL[status as Stage] : 0;
  return 2 * Math.PI * radius * (1 - fill);
}
