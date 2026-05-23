export const ADD_MS = 600;
export const BADGE_PEAK = 1.2;
export const BADGE_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

const FLIGHT_START = 80;
const FLIGHT_END = 440;

export function quad(start: number, control: number, end: number, t: number): number {
  const rest = 1 - t;
  return rest * rest * start + 2 * rest * t * control + t * t * end;
}

type Rect = Pick<DOMRect, "x" | "y" | "width" | "height">;

export function flyFrame(from: Rect, to: Rect, t: number, viewportHeight: number) {
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  const endX = to.x + to.width / 2;
  const endY = to.y + to.height / 2;
  const controlX = (startX + endX) / 2;
  const controlY = Math.min(startY, endY) - viewportHeight * 0.3;
  return {
    x: quad(startX, controlX, endX, t),
    y: quad(startY, controlY, endY, t),
    scale: 1 - 0.6 * t,
    rotate: 12 * t,
  };
}

let flying = 0;

export function launchCup(from: Rect, color: string, tier: "full" | "lite" | "static"): void {
  const cart = document.getElementById("cart");
  if (!cart) return;
  const to = cart.getBoundingClientRect();
  if (tier === "full" && flying < 3) {
    flying += 1;
    const cup = document.createElement("div");
    cup.setAttribute("aria-hidden", "true");
    cup.style.position = "fixed";
    cup.style.left = "0";
    cup.style.top = "0";
    cup.style.width = "36px";
    cup.style.height = "36px";
    cup.style.marginLeft = "-18px";
    cup.style.marginTop = "-18px";
    cup.style.borderRadius = "999px";
    cup.style.background = color;
    cup.style.pointerEvents = "none";
    cup.style.zIndex = "70";
    document.body.appendChild(cup);
    const started = performance.now();
    const tick = (now: number) => {
      const elapsed = now - started;
      const t = Math.min(1, Math.max(0, (elapsed - FLIGHT_START) / (FLIGHT_END - FLIGHT_START)));
      const frame = flyFrame(from, to, t, window.innerHeight);
      cup.style.transform = `translate(${frame.x}px, ${frame.y}px) scale(${frame.scale}) rotate(${frame.rotate}deg)`;
      if (elapsed < FLIGHT_END) {
        requestAnimationFrame(tick);
        return;
      }
      cup.remove();
      flying -= 1;
    };
    requestAnimationFrame(tick);
  }
  if (tier === "static") return;
  const delay = tier === "full" ? FLIGHT_END : 0;
  cart.animate(
    [{ transform: "translateY(0)" }, { transform: "translateY(-4px)" }, { transform: "translateY(0)" }],
    { duration: ADD_MS - FLIGHT_END, delay, easing: BADGE_EASE },
  );
  document.getElementById("cart-badge")?.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.2)" }, { transform: "scale(1)" }],
    { duration: ADD_MS - FLIGHT_END, delay, easing: BADGE_EASE },
  );
}
