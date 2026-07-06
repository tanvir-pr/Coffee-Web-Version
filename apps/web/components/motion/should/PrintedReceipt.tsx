"use client";

import { useEffect, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { receiptLines, receiptPdf } from "@/lib/motion/should";

type ReceiptOrder = {
  id: string;
  code: string;
  subtotal: string;
  tax: string;
  total: string;
  items: { quantity: number; name: string; unit_price: string }[];
};

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PrintedReceipt({ order }: { order: ReceiptOrder }) {
  const tier = useTier();
  const lines = receiptLines(order);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    const key = `crema:receipt:${order.id}`;
    const seen = window.sessionStorage.getItem(key) === "1";
    const frame = requestAnimationFrame(() => setFresh(!seen));
    window.sessionStorage.setItem(key, "1");
    return () => cancelAnimationFrame(frame);
  }, [order.id]);

  async function save() {
    const file = new File([lines.join("\n")], `crema-${order.code}.txt`, { type: "text/plain" });
    if (navigator.share) {
      try {
        await navigator.share({ title: `Crema ${order.code}`, text: lines.join("\n"), files: [file] });
        return;
      } catch {
        /* the visitor dismissed the share sheet */
      }
    }
    download(file.name, file);
  }

  return (
    <section className="receipt-slot" aria-label="Receipt">
      <article
        className={fresh && tier !== "static" ? `receipt ${tier === "lite" ? "receipt-lite" : "receipt-print"}` : "receipt"}
        onPointerDown={(event) => {
          event.currentTarget.dataset.pull = String(event.clientY);
        }}
        onPointerUp={(event) => {
          const origin = Number(event.currentTarget.dataset.pull ?? event.clientY);
          if (event.clientY - origin > 80) void save();
        }}
      >
        {lines.map((line, index) => (
          <p
            key={line}
            className="receipt-line font-mono text-sm"
            style={fresh && tier === "full" ? { animationDelay: `${150 + index * 70}ms` } : undefined}
          >
            {line}
          </p>
        ))}
        <p className="mt-3 font-mono text-lg">Pickup {order.code}</p>
      </article>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="rounded-full bg-primary px-4 py-2 font-sans text-sm text-on-primary" onClick={() => void save()}>
          Save receipt
        </button>
        <button
          type="button"
          className="rounded-full px-4 py-2 font-sans text-sm"
          onClick={() => download(`crema-${order.code}.pdf`, new Blob([new Uint8Array(receiptPdf(lines))], { type: "application/pdf" }))}
        >
          Download PDF
        </button>
      </div>
    </section>
  );
}
