"use client";

import { useEffect, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { fetchOrder, type PlacedOrder } from "@/lib/checkout/api";
import { POLL_MS, STAGE_LABEL, STAGES, ringOffset, type Stage } from "@/lib/track/stages";

type TrackEvent = { id: number; status: string; reason: string | null; at: string };

export function OrderTracker({ orderId, initial }: { orderId: string; initial: PlacedOrder }) {
  const tier = useTier();
  const [order, setOrder] = useState(initial);

  useEffect(() => {
    let source: EventSource | null = null;
    let poll = 0;
    const apply = (next: PlacedOrder) => setOrder(next);
    const startPoll = () => {
      if (poll) return;
      poll = window.setInterval(() => {
        void fetchOrder(orderId).then((next) => {
          if (next) apply(next);
        });
      }, POLL_MS);
    };
    const startStream = () => {
      if (document.hidden || source) return;
      source = new EventSource(`/backend/v1/orders/${orderId}/events`);
      source.addEventListener("status", () => {
        void fetchOrder(orderId).then((next) => {
          if (next) apply(next);
        });
      });
      source.onerror = () => {
        startPoll();
      };
    };
    const onVisibility = () => {
      if (document.hidden) {
        source?.close();
        source = null;
        window.clearInterval(poll);
        poll = 0;
        return;
      }
      startStream();
    };
    startStream();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      source?.close();
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [orderId]);

  const events = (order.events ?? []) as TrackEvent[];
  const stamp = (status: string) => events.find((event) => event.status === status)?.at;
  const cancelled = order.status === "cancelled";
  const offset = ringOffset(order.status);

  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      <svg viewBox="0 0 120 120" className="h-36 w-36" data-motion={tier} role="img" aria-label={cancelled ? "Cancelled" : STAGE_LABEL[order.status as Stage] ?? order.status}>
        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" />
        <circle
          className="track-ring"
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 46}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      {cancelled ? <p className="font-sans text-lg">Cancelled</p> : null}
      <ol className="flex flex-col gap-2">
        {STAGES.map((stage) => {
          const at = stamp(stage);
          const reached = STAGES.indexOf(stage) <= STAGES.indexOf(order.status as Stage);
          return (
            <li key={stage} className={reached ? "font-sans" : "font-sans text-muted"}>
              {STAGE_LABEL[stage]}
              {at ? <time className="ml-2 font-mono text-sm text-muted">{new Date(at).toLocaleTimeString()}</time> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
