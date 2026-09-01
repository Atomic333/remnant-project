/** Canonical public URL encoded in a marker's QR code. */
export const markerQrUrl = (id: string, stored?: string) =>
  stored || `https://markerquest.ai/marker/${id}`;

const QR_PX = 1100; // printed QR size in px
const PAD = 60;
const CAPTION_H = 190;

/**
 * Render an on-screen QR <svg> to a high-resolution PNG with a
 * name + id caption, and trigger a download.
 */
export async function downloadMarkerQrPng(
  svg: SVGSVGElement,
  opts: { name: string; id: string; fileName?: string },
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(QR_PX));
  clone.setAttribute("height", String(QR_PX));

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(clone),
  )}`;

  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("QR render failed"));
    img.src = svgUrl;
  });

  const width = QR_PX + PAD * 2;
  const height = QR_PX + PAD * 2 + CAPTION_H;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // White quiet zone / print background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, PAD, PAD, QR_PX, QR_PX);

  const centerX = width / 2;
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Marker name, shrunk to fit the width
  let fontSize = 76;
  const maxTextWidth = width - PAD * 2;
  do {
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
    fontSize -= 4;
  } while (ctx.measureText(opts.name).width > maxTextWidth && fontSize > 28);
  ctx.fillText(opts.name, centerX, QR_PX + PAD * 2 + 66);

  ctx.font = `400 48px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "#666666";
  ctx.fillText(opts.id, centerX, QR_PX + PAD * 2 + 136);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName ?? `qr-${opts.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
