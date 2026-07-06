export function ritualMs(tier: "full" | "lite" | "static"): number {
  if (tier === "static") return 150;
  if (tier === "lite") return 300;
  return 750;
}

export function magnetOffset(delta: number): number {
  return Math.max(-8, Math.min(8, delta * 0.25));
}

export function holdFinished(elapsed: number, duration = 1200): boolean {
  return elapsed >= duration;
}

export const CATEGORY_STYLE: Record<string, { fill: string; ink: string }> = {
  espresso: { fill: "#6B3A2A", ink: "#F7F4EE" },
  "cold-brew": { fill: "#3B2217", ink: "#F7F4EE" },
  "matcha-tea": { fill: "#2F5A28", ink: "#F7F4EE" },
  signature: { fill: "#8A5A32", ink: "#F7F4EE" },
  bakery: { fill: "#F0D8B8", ink: "#2B1A12" },
  beans: { fill: "#E8C9A4", ink: "#2B1A12" },
};

export function categoryStyle(slug: string): { fill: string; ink: string } {
  return CATEGORY_STYLE[slug] ?? { fill: "#E8C4A8", ink: "#2B1A12" };
}

export function receiptLines(order: {
  code: string;
  subtotal: string;
  tax: string;
  total: string;
  items: { quantity: number; name: string; unit_price: string }[];
}): string[] {
  return [
    "CREMA",
    ...order.items.map((item) => `${item.quantity} x ${item.name}  ${item.unit_price}`),
    `Subtotal  ${order.subtotal}`,
    `Tax  ${order.tax}`,
    `Total  ${order.total}`,
    `Pickup  ${order.code}`,
  ];
}

export function receiptPdf(lines: string[]): Uint8Array {
  const safe = lines.map((line) => line.replace(/[()\\]/g, ""));
  const stream = safe.map((line, index) => `BT /F1 11 Tf 36 ${520 - index * 18} Td (${line}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 560] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let body = "%PDF-1.1\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}
