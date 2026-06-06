export const HERO_SNAP = [0, 0.58, 1] as const;
export const HERO_PIN_DISTANCE = "+=220%";
export const HERO_LITE_SECONDS = 2.4;
export const HERO_CARDS = [
  { href: "/menu/matcha-latte", name: "Matcha Latte", note: "Oat, whisked to order" },
  { href: "/menu/oat-flat-white", name: "Oat Flat White", note: "Short ristretto" },
  { href: "/menu/berry-cold-brew", name: "Berry Cold Brew", note: "Slow brew, berry band" },
] as const;

const CARD_AT = 0.88;
const CARD_DURATION = 0.08;

export function cardStagger(count = HERO_CARDS.length): number {
  if (count <= 1) return 0;
  return (1 - CARD_AT - CARD_DURATION) / (count - 1);
}

export type HeroTween = {
  id: string;
  at: number;
  duration: number;
  ease: string;
  stagger?: number;
  count?: number;
};

export const HERO_TWEENS: HeroTween[] = [
  { id: "stream-in", at: 0.05, duration: 0.1, ease: "power1.in" },
  { id: "liquid", at: 0.1, duration: 0.5, ease: "none" },
  { id: "crema", at: 0.3, duration: 0.3, ease: "power2.out" },
  { id: "copy", at: 0.15, duration: 0.4, ease: "power1.inOut" },
  { id: "stream-out", at: 0.6, duration: 0.06, ease: "power2.in" },
  { id: "drip", at: 0.6, duration: 0.06, ease: "power2.in" },
  { id: "steam", at: 0.66, duration: 0.19, ease: "sine.out" },
  { id: "art", at: 0.8, duration: 0.06, ease: "power1.inOut" },
  { id: "cup", at: 0.86, duration: 0.14, ease: "power3.inOut" },
  {
    id: "cards",
    at: CARD_AT,
    duration: CARD_DURATION,
    ease: "power3.inOut",
    stagger: cardStagger(),
    count: HERO_CARDS.length,
  },
];

export function tweenEnd(tween: HeroTween): number {
  const steps = Math.max(0, (tween.count ?? 1) - 1);
  return tween.at + steps * (tween.stagger ?? 0) + tween.duration;
}

export function heroTimelineEnd(tweens: HeroTween[] = HERO_TWEENS): number {
  return Math.max(...tweens.map(tweenEnd));
}

export type HeroPose = "idle" | "pinned" | "pouring" | "settling" | "steaming" | "revealing" | "released";

export function heroState(progress: number): HeroPose {
  if (progress < 0) return "idle";
  if (progress < 0.05) return "pinned";
  if (progress < 0.6) return "pouring";
  if (progress < 0.66) return "settling";
  if (progress < 0.86) return "steaming";
  if (progress < 1) return "revealing";
  return "released";
}

export function clampWave(amp: number): number {
  return Math.max(-6, Math.min(6, amp));
}

export function waveAmp(progress: number, velocity: number): number {
  const base = progress >= 0.1 && progress <= 0.6 ? 3 : 0;
  return clampWave(base + velocity / 800);
}

export function heroWavePath(amp: number, phase: number): string {
  const a = clampWave(amp);
  const crest = Math.sin(phase) * a;
  const trough = Math.sin(phase + 1.4) * a * 0.65;
  return `M0 0 Q30 ${crest} 60 ${trough} T120 0 V170 H0 Z`;
}

type TimelineTarget = {
  fromTo: (selector: string, from: Record<string, unknown>, to: Record<string, unknown>, at: number) => void;
  to: (selector: string, to: Record<string, unknown>, at: number) => void;
};

function tween(id: string): HeroTween {
  const found = HERO_TWEENS.find((item) => item.id === id);
  if (!found) throw new Error(`Missing hero tween ${id}`);
  return found;
}

export function buildHeroTimeline(target: TimelineTarget, options: { art: boolean; desk: boolean }) {
  const streamIn = tween("stream-in");
  target.fromTo(
    ".stream",
    { scaleY: 0, transformOrigin: "50% 0%" },
    { scaleY: 1, duration: streamIn.duration, ease: streamIn.ease },
    streamIn.at,
  );

  const liquid = tween("liquid");
  target.fromTo(".liquid", { yPercent: 0 }, { yPercent: -55, duration: liquid.duration, ease: liquid.ease }, liquid.at);

  const crema = tween("crema");
  target.fromTo(
    ".crema",
    { scaleY: 0, fill: "#C98B4F", transformOrigin: "50% 100%" },
    { scaleY: 1, fill: "#D9A36A", duration: crema.duration, ease: crema.ease },
    crema.at,
  );

  const copy = tween("copy");
  target.to(".hero-copy", { autoAlpha: 0, y: -24, duration: copy.duration, ease: copy.ease }, copy.at);

  const streamOut = tween("stream-out");
  target.to(
    ".stream",
    { scaleY: 0, transformOrigin: "50% 100%", duration: streamOut.duration, ease: streamOut.ease },
    streamOut.at,
  );

  const drip = tween("drip");
  target.fromTo(
    ".drip",
    { y: 0, autoAlpha: 0 },
    { y: 40, autoAlpha: 1, duration: drip.duration, ease: drip.ease },
    drip.at,
  );

  const steam = tween("steam");
  target.fromTo(
    ".steam",
    { autoAlpha: 0, y: 18 },
    { autoAlpha: 1, y: 0, duration: steam.duration, ease: steam.ease },
    steam.at,
  );

  if (options.art) {
    const art = tween("art");
    target.fromTo(
      ".art-path",
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: art.duration, ease: art.ease },
      art.at,
    );
  }

  const cup = tween("cup");
  target.to(
    ".cup",
    {
      x: options.desk ? "-32vw" : 0,
      scale: options.desk ? 0.8 : 1,
      duration: cup.duration,
      ease: cup.ease,
    },
    cup.at,
  );

  const cards = tween("cards");
  target.fromTo(
    ".menu-card",
    { x: options.desk ? 80 : 0, autoAlpha: 0 },
    {
      x: 0,
      autoAlpha: 1,
      duration: cards.duration,
      ease: cards.ease,
      stagger: cards.stagger,
    },
    cards.at,
  );
}
