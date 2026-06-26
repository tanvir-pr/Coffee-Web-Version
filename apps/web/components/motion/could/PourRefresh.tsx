"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";
import { LatteLoader } from "@/components/motion/LatteLoader";
import { PULL_THRESHOLD, dropScale, shouldRefresh } from "@/lib/motion/could";

export function PourRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ReactNode }) {
  const on = useCould("14");
  const tier = useTier();
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const drop = useRef<HTMLSpanElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);

  if (!on) return children;

  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      armedRef.current = false;
      setArmed(false);
      if (list.current) list.current.style.transform = "";
      if (drop.current) drop.current.style.transform = "scale(0)";
    }
  }

  function move(clientY: number, origin: number) {
    const node = list.current;
    const mark = drop.current;
    const pull = Math.max(0, clientY - origin);
    if (node) node.style.transform = `translateY(${pull * 0.5}px)`;
    if (mark) mark.style.transform = `scale(${dropScale(pull)})`;
    const nextArmed = pull > PULL_THRESHOLD;
    if (nextArmed !== armedRef.current) {
      armedRef.current = nextArmed;
      setArmed(nextArmed);
      if (nextArmed) navigator.vibrate?.(12);
    }
    return pull;
  }

  return (
    <div
      ref={scroller}
      className="pour-refresh"
      style={{ overscrollBehaviorY: "contain" }}
      onPointerDown={(event) => {
        if (tier === "static" || refreshing) return;
        if ((scroller.current?.scrollTop ?? 0) > 0) return;
        const origin = event.clientY;
        const pointer = event.pointerId;
        event.currentTarget.setPointerCapture(pointer);
        const onMove = (moveEvent: PointerEvent) => {
          if (moveEvent.pointerId !== pointer) return;
          move(moveEvent.clientY, origin);
        };
        const onUp = (upEvent: PointerEvent) => {
          if (upEvent.pointerId !== pointer) return;
          const pull = move(upEvent.clientY, origin);
          event.currentTarget.removeEventListener("pointermove", onMove);
          if (shouldRefresh(pull, (scroller.current?.scrollTop ?? 0) === 0)) void refresh();
          else {
            armedRef.current = false;
            setArmed(false);
            if (list.current) list.current.style.transform = "";
            if (drop.current) drop.current.style.transform = "scale(0)";
          }
        };
        event.currentTarget.addEventListener("pointermove", onMove);
        event.currentTarget.addEventListener("pointerup", onUp, { once: true });
        event.currentTarget.addEventListener("pointercancel", onUp, { once: true });
      }}
    >
      <div className="pour-refresh-mark" aria-hidden>
        <span ref={drop} className="pour-drop" />
        <span className={armed ? "pour-cup is-armed" : "pour-cup"} />
      </div>
      <div ref={list}>{children}</div>
      <button type="button" className="font-sans text-sm text-muted" onClick={() => void refresh()}>
        Refresh
      </button>
      {refreshing ? <LatteLoader label="Refreshing" /> : null}
    </div>
  );
}
