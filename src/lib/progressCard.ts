import logo from "@/assets/logo.png";
import type { CityProgress } from "@/lib/visitStats";

const W = 1080;
const H = 1350;

const FONT = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = src;
    });
    return img;
  } catch {
    return null;
  }
}

export interface ProgressCardOptions {
  name: string;
  visited: number;
  total: number;
  pct: number;
  cities: CityProgress[];
  shareUrl?: string | null;
}

/** Render a portrait "MarkerQuest passport" PNG and trigger a download. */
export async function downloadProgressCard(opts: ProgressCardOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#faf7ff");
  bg.addColorStop(1, "#efe8fb");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Logo
  const mark = await loadImage(logo);
  if (mark) {
    const size = 120;
    ctx.drawImage(mark, 80, 90, size, size);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#6d28d9";
  ctx.font = `600 52px ${FONT}`;
  ctx.fillText("MarkerQuest.ai", mark ? 220 : 80, 168);

  ctx.fillStyle = "#3f3d56";
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText("Visit passport", mark ? 222 : 82, 214);

  // Name
  ctx.fillStyle = "#1a1730";
  let nameSize = 76;
  do {
    ctx.font = `700 ${nameSize}px ${FONT}`;
    nameSize -= 4;
  } while (ctx.measureText(opts.name).width > W - 160 && nameSize > 36);
  ctx.fillText(opts.name, 80, 380);

  // Big stat
  ctx.fillStyle = "#6d28d9";
  ctx.font = `700 200px ${FONT}`;
  ctx.fillText(`${opts.visited}`, 80, 610);
  const numW = ctx.measureText(`${opts.visited}`).width;
  ctx.fillStyle = "#4b4863";
  ctx.font = `600 56px ${FONT}`;
  ctx.fillText(`/ ${opts.total} markers`, 100 + numW, 610);

  ctx.fillStyle = "#4b4863";
  ctx.font = `500 40px ${FONT}`;
  ctx.fillText(`${opts.pct}% complete`, 80, 680);

  // Overall bar
  const barX = 80;
  const barW = W - 160;
  ctx.fillStyle = "#e0d6f5";
  ctx.beginPath();
  ctx.roundRect(barX, 720, barW, 24, 12);
  ctx.fill();
  if (opts.pct > 0) {
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath();
    ctx.roundRect(barX, 720, Math.max(24, (barW * opts.pct) / 100), 24, 12);
    ctx.fill();
  }

  // Per-city rows
  let y = 850;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillStyle = "#1a1730";
  ctx.fillText("Cities", barX, y);
  y += 40;

  for (const row of opts.cities) {
    ctx.fillStyle = "#1a1730";
    ctx.font = `600 38px ${FONT}`;
    ctx.fillText(`${row.city.name}, ${row.city.state}`, barX, y + 44);

    ctx.textAlign = "right";
    ctx.fillStyle = "#4b4863";
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(
      row.total > 0 ? `${row.visited} / ${row.total}` : "Coming soon",
      barX + barW,
      y + 44,
    );
    ctx.textAlign = "left";

    ctx.fillStyle = "#e0d6f5";
    ctx.beginPath();
    ctx.roundRect(barX, y + 66, barW, 16, 8);
    ctx.fill();
    if (row.pct > 0) {
      ctx.fillStyle = "#7c3aed";
      ctx.beginPath();
      ctx.roundRect(barX, y + 66, Math.max(16, (barW * row.pct) / 100), 16, 8);
      ctx.fill();
    }
    y += 130;
  }

  // Footer / share URL
  ctx.textAlign = "center";
  ctx.fillStyle = "#6d28d9";
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText(opts.shareUrl || "markerquest.ai", W / 2, H - 110);
  ctx.fillStyle = "#6b6884";
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText("Explore historical markers near you", W / 2, H - 60);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't create the image");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "markerquest-passport.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
