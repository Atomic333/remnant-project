import { useState, useEffect, useRef } from "react";
import { QrCode, CheckCircle, CameraOff, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import PageHeader from "@/components/PageHeader";
import { Html5Qrcode } from "html5-qrcode";

type ScanState = "idle" | "scanning" | "success" | "not-found" | "external-url";

const ScanPage = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [resultLabel, setResultLabel] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = async () => {
    if (scannerRef.current && isRunningRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      isRunningRef.current = false;
    }
  };

  const handleScanResult = (decodedText: string) => {
    stopScanner();
    let isUrl = false;
    let markerId: string | null = null;
    let hostname = "";
    try {
      const url = new URL(decodedText);
      isUrl = true;
      hostname = url.hostname;
      const parts = url.pathname.split("/");
      const markerIdx = parts.indexOf("marker");
      if (markerIdx !== -1 && parts[markerIdx + 1]) markerId = parts[markerIdx + 1];
    } catch {
      markerId = decodedText.trim();
    }
    if (markerId) {
      const found = markers.find((m) => m.id === markerId);
      if (found) {
        setResultLabel(found.name);
        setScanState("success");
        setTimeout(() => navigate(`/marker/${markerId}`), 1500);
        return;
      }
    }
    if (isUrl) { setResultLabel(hostname); setScanState("external-url"); return; }
    setResultLabel(decodedText.slice(0, 40));
    setScanState("not-found");
  };

  const resetScanner = () => {
    setScanState("idle");
    setCameraError(null);
    setShowManual(false);
    setManualCode("");
  };

  useEffect(() => {
    if (scanState !== "idle" || showManual) return;
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => handleScanResult(decodedText),
          () => {}
        );
        isRunningRef.current = true;
        setScanState("scanning");
      } catch (err: any) {
        setCameraError(
          err?.message?.includes("NotAllowed")
            ? "Camera permission denied. Use manual entry below."
            : "Could not access camera. Use manual entry below."
        );
      }
    };
    startScanner();
    return () => { stopScanner(); };
  }, [scanState, showManual]);

  const handleOpenMarker = () => {
    const code = manualCode.trim();
    if (!code) return;
    const found = markers.find((m) => m.id === code);
    if (found) {
      setResultLabel(found.name);
      setScanState("success");
      setTimeout(() => navigate(`/marker/${found.id}`), 1500);
    } else {
      setResultLabel(code.length > 40 ? code.slice(0, 40) + "…" : code);
      setScanState("not-found");
    }
  };

  if (scanState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-variant">
            <CheckCircle className="h-10 w-10 text-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Marker Found!</h2>
          <p className="text-sm text-on-surface-variant">{resultLabel}</p>
          <p className="text-xs text-on-surface-variant">Opening…</p>
        </div>
      </div>
    );
  }

  if (scanState === "not-found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
        <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">No Marker Found</h2>
          <p className="max-w-xs text-sm text-on-surface-variant">
            <span className="font-semibold text-foreground">"{resultLabel}"</span> doesn't match any known marker.
          </p>
          <button
            onClick={resetScanner}
            className="mt-2 rounded-lg bg-foreground px-8 py-3 font-display text-sm font-bold text-background"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (scanState === "external-url") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
        <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-variant">
            <QrCode className="h-10 w-10 text-on-surface-variant" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Not a Trail Marker</h2>
          <p className="max-w-xs text-sm text-on-surface-variant">
            That QR code points to <span className="font-semibold text-foreground">{resultLabel}</span>, which isn't part of this app.
          </p>
          <button
            onClick={resetScanner}
            className="mt-2 rounded-lg bg-foreground px-8 py-3 font-display text-sm font-bold text-background"
          >
            Scan Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-20 bg-background">
      <PageHeader title="Scan" />

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative mb-8 h-64 w-64 overflow-hidden rounded-[20px] bg-surface-variant elevation-1">
          {cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <CameraOff className="h-12 w-12 text-on-surface-variant" />
              <p className="text-xs text-on-surface-variant">{cameraError}</p>
            </div>
          ) : (
            <div id="qr-reader" ref={containerRef} className="qr-reader-container h-full w-full" />
          )}
          {scanState === "idle" && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode className="h-16 w-16 animate-pulse text-on-surface-variant" />
            </div>
          )}
        </div>

        <p className="mb-6 text-center text-sm text-on-surface-variant">
          {cameraError ? "" : scanState === "scanning" ? "Point at the QR code on the marker" : "Starting camera…"}
        </p>

        <button
          onClick={() => { stopScanner(); setShowManual(!showManual); }}
          className="text-sm font-bold text-foreground underline"
        >
          Enter Code Manually
        </button>

        {showManual && (
          <div className="mt-4 w-full max-w-xs animate-fade-in">
            <input
              type="text"
              placeholder="Enter marker code..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-foreground"
            />
            <button
              onClick={handleOpenMarker}
              disabled={!manualCode.trim()}
              className="mt-3 w-full rounded-lg bg-primary py-3 font-display text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              Open Marker
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPage;
