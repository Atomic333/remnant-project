import { useState, useEffect, useRef } from "react";
import { QrCode, CheckCircle, CameraOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import PageHeader from "@/components/PageHeader";
import { Html5Qrcode } from "html5-qrcode";

const ScanPage = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [successMarker, setSuccessMarker] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
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

    // Extract marker ID from URL or use raw text
    let code = decodedText;
    try {
      const url = new URL(decodedText);
      const parts = url.pathname.split("/");
      const markerIdx = parts.indexOf("marker");
      if (markerIdx !== -1 && parts[markerIdx + 1]) {
        code = parts[markerIdx + 1];
      }
    } catch {
      // Not a URL, use as-is
    }

    const found = markers.find((m) => m.id === code);
    setSuccessMarker(found?.name ?? code);
    setTimeout(() => navigate(`/marker/${code}`), 1500);
  };

  useEffect(() => {
    if (successMarker || showManual) return;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => handleScanResult(decodedText),
          () => {} // ignore scan failures
        );
        isRunningRef.current = true;
        setScanning(true);
      } catch (err: any) {
        setCameraError(
          err?.message?.includes("NotAllowed")
            ? "Camera permission denied. Use manual entry below."
            : "Could not access camera. Use manual entry below."
        );
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [successMarker, showManual]);

  const handleOpenMarker = () => {
    const code = manualCode.trim() || "union-station";
    const found = markers.find((m) => m.id === code);
    setSuccessMarker(found?.name ?? code);
    setTimeout(() => navigate(`/marker/${code}`), 1500);
  };

  if (successMarker) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <CheckCircle className="h-20 w-20 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Marker Found!</h2>
          <p className="text-sm text-muted-foreground">{successMarker}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <PageHeader title="Scan" back />

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* QR Camera */}
        <div className="relative mb-8 h-64 w-64 overflow-hidden rounded-2xl border border-border bg-muted">
          {cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <CameraOff className="h-12 w-12 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{cameraError}</p>
            </div>
          ) : (
            <div id="qr-reader" ref={containerRef} className="h-full w-full" />
          )}
          {!scanning && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode className="h-16 w-16 animate-pulse text-muted-foreground" />
            </div>
          )}
        </div>

        <p className="mb-6 text-center text-sm text-muted-foreground">
          {scanning ? "Point at the QR code on the marker" : "Starting camera…"}
        </p>

        <button
          onClick={() => {
            stopScanner();
            setShowManual(!showManual);
          }}
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
              className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleOpenMarker}
              className="mt-3 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
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