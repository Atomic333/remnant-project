import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Printer } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import MarkerQrCard from "@/components/MarkerQrCard";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { useAuth } from "@/hooks/useAuth";

const QrSheetPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const markers = useAllMarkers();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pb-20">
        <PageHeader title="QR Codes" />
        <p className="px-5 pt-6 text-center text-sm text-on-surface-variant">
          Admin access required.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <style>{`
        @media print {
          .qr-hide-print, header, nav { display: none !important; }
          .qr-sheet { max-width: none !important; }
          .qr-card { break-inside: avoid; page-break-inside: avoid; }
          body { background: #fff; }
        }
      `}</style>

      <div className="qr-hide-print">
        <PageHeader title="QR Codes" />
      </div>

      <div className="qr-sheet px-5 pt-4">
        <div className="qr-hide-print mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant">
            {markers.length} markers — print this page or save it as a PDF.
          </p>
          <button
            onClick={() => window.print()}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-medium text-primary-foreground elevation-1"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {markers.map((m) => (
            <MarkerQrCard key={m.id} marker={m} size={130} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default QrSheetPage;
