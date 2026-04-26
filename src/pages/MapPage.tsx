import { useState, useCallback, useEffect, useRef } from "react";

import { Search, List, X, QrCode, CheckCircle, CameraOff, LocateFixed } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { markers, categories } from "@/data/markers";
import type { Marker } from "@/data/markers";
import FilterChips from "@/components/FilterChips";
import MarkerCard from "@/components/MarkerCard";
import PageHeader from "@/components/PageHeader";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { GoogleMap, useJsApiLoader, Marker as GMarker } from "@react-google-maps/api";
import { useVisited } from "@/hooks/useVisited";
import { Html5Qrcode } from "html5-qrcode";
import { getMarkerImage } from "@/lib/markerImages";

const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";

const TACOMA_CENTER = { lat: 47.2529, lng: -122.4443 };
const mapContainerStyle = { width: "100%", height: "100%" };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: "greedy",
  styles: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  ],
};

// ── Progress panel ────────────────────────────────────────────────
const progressTabs = ["All", "Visited", "To See"];

const ProgressPanel = () => {
  const { visited: visitedSet } = useVisited();
  const [activeTab, setActiveTab] = useState("All");
  const navigate = useNavigate();

  const visitedCount = markers.filter((m) => visitedSet.has(m.id)).length;
  const pct = Math.round((visitedCount / markers.length) * 100);

  const filtered = markers.filter((m) => {
    if (activeTab === "Visited") return visitedSet.has(m.id);
    if (activeTab === "To See") return !visitedSet.has(m.id);
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <div className="rounded-xl bg-card p-4 elevation-1 mx-4 mt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium text-foreground">
            {visitedCount}/{markers.length}
          </h2>
          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {pct}%
          </span>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">Markers Visited</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-variant">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 mt-4 flex rounded-xl border border-border">
        {progressTabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${i === 0 ? "rounded-l-xl" : ""} ${i === progressTabs.length - 1 ? "rounded-r-xl" : ""}
              ${activeTab === tab
                ? "bg-secondary text-secondary-foreground"
                : "bg-surface text-on-surface-variant hover:bg-surface-variant"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-3 space-y-2 px-4 pb-6 overflow-y-auto flex-1">
        {filtered.map((m) => (
          <MarkerCard key={m.id} marker={m} />
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-on-surface-variant">No markers in this category yet.</div>
        )}
      </div>
    </div>
  );
};

// ── Scan panel ────────────────────────────────────────────────────
type ScanState = "idle" | "scanning" | "success" | "not-found" | "external-url";

const ScanPanel = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [resultLabel, setResultLabel] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      try { await scannerRef.current.stop(); } catch { /* already stopped */ }
      isRunningRef.current = false;
    }
  }, []);

  const handleScanResult = useCallback((decodedText: string) => {
    stopScanner();
    let markerId: string | null = null;
    let isUrl = false;
    let hostname = "";
    try {
      const url = new URL(decodedText);
      isUrl = true;
      hostname = url.hostname;
      const parts = url.pathname.split("/");
      const idx = parts.indexOf("marker");
      if (idx !== -1 && parts[idx + 1]) markerId = parts[idx + 1];
    } catch { markerId = decodedText.trim(); }

    if (markerId) {
      const found = markers.find((m) => m.id === markerId);
      if (found) {
        setResultLabel(found.name);
        setScanState("success");
        setTimeout(() => { onClose(); navigate(`/marker/${found.id}`); }, 1500);
        return;
      }
    }
    if (isUrl) { setResultLabel(hostname); setScanState("external-url"); return; }
    setResultLabel(decodedText.slice(0, 40));
    setScanState("not-found");
  }, [navigate, onClose, stopScanner]);

  useEffect(() => {
    if (scanState !== "idle" || showManual) return;
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader-map");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          handleScanResult,
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
  }, [scanState, showManual, handleScanResult, stopScanner]);

  const handleOpenMarker = () => {
    const code = manualCode.trim();
    if (!code) return;
    const found = markers.find((m) => m.id === code);
    if (found) {
      setResultLabel(found.name);
      setScanState("success");
      setTimeout(() => { onClose(); navigate(`/marker/${found.id}`); }, 1500);
    } else {
      setResultLabel(code.length > 40 ? code.slice(0, 40) + "…" : code);
      setScanState("not-found");
    }
  };

  const resetScanner = () => {
    setScanState("idle");
    setManualCode("");
    setShowManual(false);
  };

  // ── Result states ──────────────────────────────────────────────
  if (scanState === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h2 className="font-display text-xl font-medium text-foreground">Marker Found!</h2>
        <p className="text-sm text-on-surface-variant">{resultLabel}</p>
      </div>
    );
  }

  if (scanState === "not-found") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <X className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="font-display text-xl font-medium text-foreground">No Marker Found</h2>
        <p className="text-sm text-on-surface-variant max-w-xs">
          <span className="font-medium text-foreground">"{resultLabel}"</span> doesn't match any known marker.
        </p>
        <button onClick={resetScanner} className="mt-2 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground">
          Try Again
        </button>
      </div>
    );
  }

  if (scanState === "external-url") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <QrCode className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="font-display text-xl font-medium text-foreground">Not a Trail Marker</h2>
        <p className="text-sm text-on-surface-variant max-w-xs">
          That QR code points to <span className="font-medium text-foreground">{resultLabel}</span>, which isn't part of this app.
        </p>
        <button onClick={resetScanner} className="mt-2 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground">
          Scan Again
        </button>
      </div>
    );
  }

  // ── Main scanner UI ────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center px-6 pb-6">
      <div className="relative mb-6 h-64 w-64 overflow-hidden rounded-xl bg-surface-variant elevation-1">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <CameraOff className="h-12 w-12 text-on-surface-variant" />
            <p className="text-xs text-on-surface-variant">{cameraError}</p>
          </div>
        ) : (
          <div id="qr-reader-map" className="qr-reader-container h-full w-full" />
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
        className="text-sm font-medium text-primary"
      >
        Enter Code Manually
      </button>

      {showManual && (
        <div className="mt-4 w-full max-w-xs">
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
  );
};

// ── MapPage ───────────────────────────────────────────────────────
type Sheet = "scan" | "progress" | null;

const MapPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isVisited } = useVisited();
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showList, setShowList] = useState(false);
  const [activeSheet, setActiveSheet] = useState<Sheet>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  // Open scan sheet when navigated with ?scan=1 (from hamburger menu)
  useEffect(() => {
    if (searchParams.get("scan") === "1") {
      setActiveSheet("scan");
      searchParams.delete("scan");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Watch user's GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently fail if denied
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const filtered = markers.filter((m) => {
    const matchCat = activeFilter === "All" || m.category === activeFilter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const onMarkerClick = useCallback((m: Marker) => {
    setSelectedMarker(m);
    setShowList(false);
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  return (
    <div className="relative flex h-screen flex-col pb-16">
      <PageHeader title="Map" />

      {/* Search bar */}
      <div className="absolute left-0 right-0 top-[80px] z-30 px-4">
        <div className={`flex items-center gap-3 bg-background/90 backdrop-blur-sm px-4 py-3 elevation-2 ${search && filtered.length > 0 ? "rounded-t-xl" : "rounded-xl"}`}>
          <Search className="h-5 w-5 shrink-0 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search markers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-5 w-5 text-on-surface-variant" />
            </button>
          )}
          <button
            onClick={() => setShowList(!showList)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        {search && (
          <div className="max-h-64 overflow-y-auto rounded-b-xl bg-card elevation-2 border-t border-border">
            {filtered.length > 0 ? filtered.slice(0, 8).map((m) => (
              <button
                key={m.id}
                onClick={() => { navigate(`/marker/${m.id}`); setSearch(""); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-variant transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-on-surface-variant">{m.address}</p>
                </div>
              </button>
            )) : (
              <p className="px-4 py-3 text-sm text-on-surface-variant">No results for "{search}"</p>
            )}
          </div>
        )}
      </div>

      {/* Floating action buttons — Scan + Locate */}
      <div className="absolute top-[148px] right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => setActiveSheet(activeSheet === "scan" ? null : "scan")}
          className="flex h-11 items-center gap-2 rounded-full bg-background px-4 elevation-2 transition-all active:scale-95"
        >
          <QrCode className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-primary">Scan</span>
        </button>

        {userLocation && (
          <button
            onClick={() => mapRef.current?.panTo(userLocation)}
            className="flex h-11 w-11 items-center justify-center self-end rounded-full bg-background elevation-2 transition-all active:scale-95"
            title="Centre on my location"
          >
            <LocateFixed className="h-5 w-5 text-primary" />
          </button>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={TACOMA_CENTER}
            zoom={14}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {/* Historical markers */}
            {filtered.map((m) => (
              <GMarker
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                onClick={() => onMarkerClick(m)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: isVisited(m.id) ? "#22c55e" : "#ef4444",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
              />
            ))}
            {/* User location — blue pulsing dot */}
            {userLocation && (
              <GMarker
                position={userLocation}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#3b82f6",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 3,
                }}
                title="Your location"
                zIndex={1000}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <p className="text-sm text-on-surface-variant">Loading map…</p>
          </div>
        )}
      </div>

      {/* Nearby list */}
      {showList && (
        <div
          className="fixed inset-x-0 bottom-0 z-[500] flex flex-col overflow-hidden rounded-t-2xl bg-card elevation-3 animate-slide-up"
          style={{
            maxHeight: "calc(70dvh + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Header — sticky */}
          <div className="shrink-0 rounded-t-2xl bg-card px-4 pt-4 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-medium text-foreground">
                Nearby <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{filtered.length}</span>
              </h2>
              <button
                onClick={() => setShowList(false)}
                className="icon-press state-layer flex h-8 w-8 items-center justify-center rounded-full"
              >
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="mt-3">
              <FilterChips categories={categories} active={activeFilter} onChange={setActiveFilter} />
            </div>
          </div>
          {/* Scrollable list */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="space-y-2 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              {filtered.map((m) => (
                <MarkerCard key={m.id} marker={m} showDistance />
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-on-surface-variant">No markers found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Marker preview bottom sheet */}
      <Drawer open={!!selectedMarker} onOpenChange={(open) => !open && setSelectedMarker(null)}>
        <DrawerContent className="px-4 pb-6">
          {selectedMarker && (
            <div className="pt-2">
              <DrawerTitle className="sr-only">{selectedMarker.name}</DrawerTitle>
              <div className="flex items-center gap-4">
                <img
                  src={getMarkerImage(selectedMarker.id, selectedMarker.image)}
                  alt={selectedMarker.name}
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-display text-lg font-medium text-foreground">{selectedMarker.name}</h3>
                  <p className="text-sm text-on-surface-variant">{selectedMarker.address}</p>
                  {selectedMarker.distance && (
                    <p className="mt-1 text-xs text-on-surface-variant">{selectedMarker.distance}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/marker/${selectedMarker.id}`)}
                className="mt-4 w-full rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground"
              >
                View Details
              </button>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Scan bottom sheet */}
      <Drawer open={activeSheet === "scan"} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <DrawerContent className="pb-2">
          <DrawerTitle className="px-4 pt-2 pb-4 font-display text-base font-medium text-foreground">
            Scan QR Code
          </DrawerTitle>
          {activeSheet === "scan" && <ScanPanel onClose={() => setActiveSheet(null)} />}
        </DrawerContent>
      </Drawer>

      {/* Progress bottom sheet */}
      <Drawer open={activeSheet === "progress"} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <DrawerContent className="pb-2 h-[80vh] flex flex-col">
          <DrawerTitle className="shrink-0 px-4 pt-2 pb-2 font-display text-base font-medium text-foreground">
            Progress
          </DrawerTitle>
          <div className="flex-1 overflow-hidden">
            {activeSheet === "progress" && <ProgressPanel />}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default MapPage;
