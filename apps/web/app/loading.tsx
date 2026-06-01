import { LatteLoader } from "@/components/motion/LatteLoader";

export default function Loading() {
  return (
    <div className="latte-delay grid min-h-dvh place-items-center">
      <LatteLoader />
    </div>
  );
}
