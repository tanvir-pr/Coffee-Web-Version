"use client";

import { useEffect } from "react";
import { useTier } from "@/app/providers/MotionProvider";

export function Cheers() {
  const tier = useTier();

  useEffect(() => {
    if (tier !== "full") return;
    window.dispatchEvent(new Event("crema:clink"));
  }, [tier]);

  return (
    <div className={tier === "static" ? "cheers" : "cheers cheers-play"} aria-hidden>
      <span className="cheers-cup cheers-left" />
      <span className="cheers-cup cheers-right" />
    </div>
  );
}
