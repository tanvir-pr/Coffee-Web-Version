"use client";

import { useRef, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { holdFinished } from "@/lib/motion/should";

export function HoldToConfirm({
  total,
  disabled,
  onConfirm,
}: {
  total: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const tier = useTier();
  const button = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const started = useRef(0);
  const sent = useRef(false);
  const [ask, setAsk] = useState(false);

  function finish() {
    if (sent.current || disabled) return;
    sent.current = true;
    navigator.vibrate?.(12);
    onConfirm();
  }

  function paint(progress: number) {
    button.current?.style.setProperty("--p", progress.toFixed(3));
  }

  function tick(now: number) {
    const elapsed = now - started.current;
    const progress = Math.min(1, elapsed / 1200);
    paint(progress);
    if (holdFinished(elapsed)) finish();
    else frame.current = requestAnimationFrame(tick);
  }

  function start() {
    if (disabled || sent.current || tier === "static") return;
    cancelAnimationFrame(frame.current);
    started.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }

  function cancel() {
    if (sent.current) return;
    cancelAnimationFrame(frame.current);
    paint(0);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {tier === "static" ? null : (
        <button
          ref={button}
          type="button"
          className="hold-order"
          disabled={disabled}
          aria-describedby="hold-hint"
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onKeyDown={(event) => {
            if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              start();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === "Enter" || event.key === " ") cancel();
          }}
        >
          {tier === "full" ? <span className="hold-tamper" aria-hidden /> : null}
          <span className="hold-ring" aria-hidden />
          Hold to place order · ${total}
        </button>
      )}
      <p id="hold-hint" className="font-sans text-sm text-muted">
        {tier === "static"
          ? "A tap asks you to confirm before the order is sent."
          : "Hold for 1.2 seconds. Letting go early does not place the order."}
      </p>
      <button type="button" className="font-sans text-sm text-muted underline" onClick={() => setAsk(true)}>
        Tap to place instead
      </button>
      {ask ? (
        <div role="dialog" aria-labelledby="confirm-title" className="rounded-3xl border border-[var(--crema-rim)] p-4">
          <p id="confirm-title" className="font-sans">
            Place this pickup order for ${total}?
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 font-sans text-sm text-on-primary"
              onClick={() => {
                setAsk(false);
                finish();
              }}
            >
              Confirm order
            </button>
            <button type="button" className="font-sans text-sm" onClick={() => setAsk(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
