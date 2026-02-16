import { useState } from "react";
import { QrCode, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import PageHeader from "@/components/PageHeader";

const ScanPage = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [successMarker, setSuccessMarker] = useState<string | null>(null);

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
        {/* QR Camera placeholder */}
        <div className="relative mb-8 flex h-64 w-64 items-center justify-center rounded-2xl bg-foreground/90">
          <div className="absolute inset-4 rounded-xl border-2 border-primary-foreground/30" />
          <QrCode className="h-16 w-16 text-primary-foreground/60" />
        </div>

        <p className="mb-6 text-center text-sm text-muted-foreground">
          Point at the QR code on the marker
        </p>

        <button
          onClick={() => setShowManual(!showManual)}
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
              className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
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