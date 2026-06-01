const HEART = "M40 58C24 48 22 32 32 29c5-1 8 3 8 6 0-3 3-7 8-6 10 3 8 19-8 29z";
const ROSETTA = "M40 60C40 48 40 36 40 28M40 46C30 42 24 34 28 28C34 34 38 40 40 46M40 46C50 42 56 34 52 28C46 34 42 40 40 46M40 36C32 32 28 24 32 20C36 26 38 32 40 36M40 36C48 32 52 24 48 20C44 26 42 32 40 36";

export function LatteLoader({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="latte">
      <svg viewBox="0 0 80 80" className="latte-svg" aria-hidden="true">
        <circle cx="40" cy="40" r="36" className="latte-disc" />
        <path className="latte-art latte-heart" pathLength={1} d={HEART} />
        <path className="latte-art latte-rosetta" pathLength={1} d={ROSETTA} />
      </svg>
      <span className="latte-label">{label}…</span>
    </span>
  );
}
