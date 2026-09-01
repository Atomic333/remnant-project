import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2 } from "lucide-react";
import type { Marker } from "@/data/markers";
import { downloadMarkerQrPng, markerQrUrl } from "@/lib/qrDownload";
import { toast } from "@/hooks/use-toast";

interface Props {
  marker: Pick<Marker, "id" | "name" | "qrUrl">;
  size?: number;
  showDownload?: boolean;
  showCaption?: boolean;
}

const MarkerQrCard = ({ marker, size = 140, showDownload = true, showCaption = true }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const value = markerQrUrl(marker.id, marker.qrUrl);

  const download = async () => {
    const svg = wrapRef.current?.querySelector("svg");
    if (!svg) return;
    setBusy(true);
    try {
      await downloadMarkerQrPng(svg as SVGSVGElement, { name: marker.name, id: marker.id });
    } catch {
      toast({ title: "Couldn't create the QR image", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="qr-card flex flex-col items-center gap-2">
      <div ref={wrapRef} className="rounded-lg bg-white p-2">
        <QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
      </div>
      {showCaption && (
        <div className="max-w-[9rem] text-center">
          <p className="truncate font-display text-xs font-medium text-foreground">{marker.name}</p>
          <p className="truncate text-[10px] text-on-surface-variant">{marker.id}</p>
        </div>
      )}
      {showDownload && (
        <button
          onClick={download}
          disabled={busy}
          className="qr-hide-print flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 font-display text-[11px] font-medium text-secondary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          PNG
        </button>
      )}
    </div>
  );
};

export default MarkerQrCard;
