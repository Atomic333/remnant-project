import { useState, useEffect, useRef } from "react";
import { QrCode, CheckCircle, CameraOff, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/markers";
import PageHeader from "@/components/PageHeader";
import { Html5Qrcode } from "html5-qrcode";

type ScanState = "idle" | "starting" | "scanning" | "success" | "not-found" | "external-url";

// Detect iOS Safari — requires explicit user gesture for getUserMedia
const isIOS = typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));

const ScanPage = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scanState, setScanState] = useState<ScanState>(isIOS ? "idle" : "starting");
  const [needsTap, setNeedsTap] = useState<boolean>(isIOS);
  const [resultLabel, setResultLabel] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // already stopped
      }
      isRunningRef.current = false;
    }
  };

  const handleScanResult = (decodedText: string) => {
    stopScanner();

    // Try to parse as URL
    let isUrl = false;
    let markerId: string | null = null;
    let hostname = "";

    try {
      const url = new URL(decodedText);
      isUrl = true;
      hostname = url.hostname;
      const parts = url.pathname.split("/");
      const markerIdx = parts.indexOf("marker");
      if (markerIdx !== -1 && parts[markerIdx + 1]) {
        markerId = parts[markerIdx + 1];
      }
    } catch {
      // Not a URL — treat as raw code
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

    // It's a URL but not one of our markers
    if (isUrl) {
      setResultLabel(hostname);
      setScanState("external-url");
      return;
    }

    // Unknown raw text / unrecognized code
    setResultLabel(decodedText.slice(0, 40));
    setScanState("not-found");
  };

  const resetScanner = () => {
    setCameraError(null);
    setShowManual(false);
    setManualCode("");
    setNeedsTap(isIOS);
    setScanState(isIOS ? "idle" : "starting");
  };

  // Patch the html5-qrcode <video> element so iOS Safari plays inline.
  // Safari refuses to render the viewfinder unless the video has playsinline + muted.
  const patchVideoForIOS = () => {
    const container = document.getElementById("qr-reader");
    if (!container) return;
    const videos = container.getElementsByTagName("video");
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      v.setAttribute("playsinline", "true");
      v.setAttribute("webkit-playsinline", "true");
      v.muted = true;
      v.setAttribute("muted", "");
      v.setAttribute("autoplay", "");
      // Nudge playback — Safari sometimes pauses after stream attach
      const playPromise = v.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {/* ignore */});
      }
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    setNeedsTap(false);
    setScanState("starting");
    try {
      // Wait a tick so the #qr-reader div is mounted
      await new Promise((r) => setTimeout(r, 0));
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => handleScanResult(decodedText),
        () => {}
      );
      isRunningRef.current = true;
      // Patch video on next frame and again shortly after for safety
      requestAnimationFrame(patchVideoForIOS);
      setTimeout(patchVideoForIOS, 250);
      setTimeout(patchVideoForIOS, 800);
      setScanState("scanning");
    } catch (err: any) {
      const msg = String(err?.message || err?.name || "");
      setCameraError(
        msg.includes("NotAllowed") || msg.includes("Permission")
          ? "Camera permission denied. Enable camera access in your browser settings, or use manual entry below."
          : msg.includes("NotFound")
          ? "No camera found on this device. Use manual entry below."
          : "Could not access camera. Use manual entry below."
      );
      setScanState("idle");
      setNeedsTap(isIOS);
    }
  };

  useEffect(() => {
    // On iOS Safari, getUserMedia must be triggered by a user gesture — wait for tap.
    if (isIOS || needsTap) return;
    if (scanState !== "starting" || showManual) return;
    startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState, showManual]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const handleOpenMarker = () => {
    const code = manualCode.trim();
    if (!code) return;
    const found = markers.find((m) => m.id === code);
    if (found) {
      setResultLabel(found.name);
      setScanState("success");
      setTimeout(() => navigate(`/marker/${found.id}`), 1500);
    } else {
      // No matching marker — show error screen
      setResultLabel(code.length > 40 ? code.slice(0, 40) + "…" : code);
      setScanState("not-found");
    }
  };

  // ── Result screens ──────────────────────────────────────────────────────────
  if (scanState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <h2 className="font-display text-xl font-medium text-foreground">Marker Found!</h2>
          <p className="text-sm text-on-surface-variant">{resultLabel}</p>
          <p className="text-xs text-on-surface-variant">Opening…</p>
        </div>
      </div>
    );
  }

  if (scanState === "not-found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-medium text-foreground">No Marker Found</h2>
          <p className="max-w-xs text-sm text-on-surface-variant">
            <span className="font-medium text-foreground">"{resultLabel}"</span> doesn't match any known Remnant Pathfinder marker.
          </p>
          <button
            onClick={resetScanner}
            className="mt-2 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (scanState === "external-url") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <QrCode className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-display text-xl font-medium text-foreground">Not a Trail Marker</h2>
          <p className="max-w-xs text-sm text-on-surface-variant">
            That QR code points to <span className="font-medium text-foreground">{resultLabel}</span>, which isn't part of this app.
          </p>
          <button
            onClick={resetScanner}
            className="mt-2 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground"
          >
            Scan Again
          </button>
        </div>
      </div>
    );
  }

  // ── Main scanner UI ─────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <PageHeader title="Scan" />

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative mb-8 h-64 w-64 overflow-hidden rounded-xl bg-surface-variant elevation-1">
          {cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <CameraOff className="h-12 w-12 text-on-surface-variant" />
              <p className="text-xs text-on-surface-variant">{cameraError}</p>
            </div>
          ) : (
            <div id="qr-reader" ref={containerRef} className="qr-reader-container h-full w-full" />
          )}
          {needsTap && !cameraError && (
            <button
              onClick={startScanner}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-variant/95 backdrop-blur-sm transition-transform active:scale-95"
            >
              <QrCode className="h-16 w-16 text-primary" />
              <span className="font-display text-sm font-medium text-foreground">Tap to start camera</span>
            </button>
          )}
          {scanState === "starting" && !needsTap && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-variant/60">
              <QrCode className="h-16 w-16 animate-pulse text-on-surface-variant" />
            </div>
          )}
        </div>

        <p className="mb-6 text-center text-sm text-on-surface-variant">
          {cameraError
            ? ""
            : needsTap
            ? "Camera access required to scan codes"
            : scanState === "scanning"
            ? "Point at the QR code on the marker"
            : "Starting camera…"}
        </p>

        {cameraError && isIOS && (
          <button
            onClick={startScanner}
            className="mb-4 rounded-xl bg-primary px-6 py-2.5 font-display text-sm font-medium text-primary-foreground"
          >
            Try Again
          </button>
        )}

        <button
          onClick={() => { stopScanner(); setShowManual(!showManual); }}
          className="text-sm font-medium text-primary"
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
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleOpenMarker}
              disabled={!manualCode.trim()}
              className="mt-3 w-full rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground disabled:opacity-50"
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
