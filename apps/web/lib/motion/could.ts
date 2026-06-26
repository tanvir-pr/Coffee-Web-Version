export const COULD_IDS = ["06", "07", "11", "14", "15", "16", "19", "20", "21"] as const;

export type CouldId = (typeof COULD_IDS)[number];

export const PULL_THRESHOLD = 72;
export const STEAM_GAP = 30;
export const STEAM_MAX = 40;
export const STEAM_TOUCH_MAX = 20;
export const FOAM_PANEL = "#8C5A33";
export const FOAM_INK = "#F7EEE3";

const SEASON_COUNT = { autumn: 36, winter: 36, spring: 24, summer: 30 } as const;

export type SeasonName = keyof typeof SEASON_COUNT;

export function previewIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  const pieces = raw.trim() === "all" ? COULD_IDS : raw.split(",");
  return new Set(pieces.map((id) => id.trim()).filter((id) => COULD_IDS.includes(id as CouldId)));
}

export function flagOn(
  id: string,
  remote: Record<string, boolean> | undefined,
  preview: Set<string>,
  kill: boolean,
): boolean {
  if (kill) return false;
  return remote?.[id] === true || preview.has(id);
}

export function dropScale(pull: number): number {
  if (pull <= 0) return 0;
  return Math.min(1, pull / PULL_THRESHOLD);
}

export function shouldRefresh(pull: number, atTop: boolean): boolean {
  return atTop && pull > PULL_THRESHOLD;
}

export function canSpawnSteam(distance: number, alive: number, touch: boolean): boolean {
  return distance >= STEAM_GAP && alive < (touch ? STEAM_TOUCH_MAX : STEAM_MAX);
}

export function rippleAllowed(interactive: boolean, selection: string, count: number, max = 3): boolean {
  if (interactive) return false;
  if (selection.trim().length > 0) return false;
  return count < max;
}

export function tiltTarget(gamma: number | null): number {
  const value = gamma == null ? 0 : -gamma;
  return Math.max(-30, Math.min(30, value));
}

export function clampPitch(degrees: number): number {
  return Math.max(-15, Math.min(15, degrees));
}

export function dragYaw(deltaX: number): number {
  return deltaX * 0.6 * (Math.PI / 180);
}

export function particleCount(theme: string, tier: "full" | "lite" | "static", mobile: boolean): number {
  if (tier === "static") return 0;
  if (tier === "lite") return 10;
  const full = SEASON_COUNT[theme as SeasonName] ?? 36;
  return mobile ? Math.min(18, full) : full;
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const red = channels[0] ?? 0;
  const green = channels[1] ?? 0;
  const blue = channels[2] ?? 0;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
