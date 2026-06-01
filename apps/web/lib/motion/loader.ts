export const LOADER_DELAY_MS = 300;
export const LOADER_MIN_MS = 500;
export const LOADER_LOOP_MS = 1200;
export const LOADER_HEART_LOOPS = 3;

export function loaderVariant(shownForMs: number): "heart" | "rosetta" {
  if (shownForMs >= LOADER_LOOP_MS * LOADER_HEART_LOOPS) return "rosetta";
  return "heart";
}

export function shouldShowLoader(pending: boolean, pendingMs: number, visibleMs: number | null): boolean {
  if (visibleMs !== null && visibleMs < LOADER_MIN_MS) return true;
  if (!pending) return false;
  return pendingMs >= LOADER_DELAY_MS;
}
