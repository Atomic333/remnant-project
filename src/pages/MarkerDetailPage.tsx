import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, MessageCircle, FileText, Check, MapPin } from "lucide-react";
import { markers } from "@/data/markers";
import { QRCodeSVG } from "qrcode.react";
import { useVisited } from "@/hooks/useVisited";
import MarkerChat from "@/components/MarkerChat";
// import StreetView from "@/components/StreetView"; // temporarily disabled
import { getStaticMapUrl } from "@/lib/staticMap";

const MarkerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const marker = markers.find((m) => m.id === id);
  const { isVisited, toggle: toggleVisited } = useVisited();
  const visited = id ? isVisited(id) : false;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["summary"]));

  if (!marker) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h2 className="font-display text-lg font-medium text-foreground">Marker Not Found</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          This marker doesn't exist or the code is incorrect.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    );
  }

  const toggle = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const sections = [
    { key: "summary", icon: BookOpen, label: "Summary" },
    { key: "sources", icon: FileText, label: "Sources" },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <div className="relative h-60 bg-surface-variant">
        <img
          src={getStaticMapUrl(marker.lat, marker.lng, { size: 600, zoom: 16 })}
          alt={`Map of ${marker.name}`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-transparent to-foreground/20" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        {marker.streetView?.copyright && (
          <span className="absolute bottom-2 right-2 rounded-md bg-background/70 px-2 py-0.5 text-[10px] text-foreground backdrop-blur-sm">
            {marker.streetView.copyright}
          </span>
        )}
        <div className="absolute bottom-4 left-5 right-5">
          <span className="text-xs font-medium text-primary-foreground/80">Marker Details</span>
          <h1 className="font-display text-2xl font-medium text-primary-foreground">{marker.name}</h1>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* Street View temporarily disabled - re-enable later */}
        {/* <div className="mb-4">
          <StreetView
            lat={marker.lat}
            lng={marker.lng}
            name={marker.name}
            panoId={marker.streetView?.panoId}
            heading={marker.streetView?.heading}
            pitch={marker.streetView?.pitch}
          />
        </div> */}

        <div className="space-y-3">
          {/* Address chip */}
          <div className="flex items-center gap-2 rounded-lg bg-surface-variant px-3 py-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm text-on-surface-variant">{marker.address}</span>
          </div>

          {/* Visit button */}
          <button
            onClick={() => id && toggleVisited(id)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-sm font-medium transition-colors ${
              visited
                ? "bg-secondary text-secondary-foreground"
                : "bg-primary text-primary-foreground elevation-1"
            }`}
          >
            {visited ? <Check className="h-4 w-4" /> : null}
            {visited ? "Visited" : "Mark as Visited"}
          </button>

          {/* Accordion */}
          {sections.map(({ key, icon: Icon, label }) => {
            const isOpen = expandedSections.has(key);
            return (
              <div key={key} className="overflow-hidden rounded-xl bg-card elevation-1">
                <button
                  onClick={() => toggle(key)}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors ${
                    isOpen ? "bg-secondary" : ""
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    isOpen ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-display font-medium text-card-foreground">{label}</span>
                </button>
                {isOpen && (
                  <div className="animate-fade-in px-4 pb-4 pt-3">
                    {key === "summary" && (
                      <p className="text-sm leading-relaxed text-on-surface-variant">{marker.summary}</p>
                    )}
                    {key === "sources" && (
                      <ul className="space-y-2">
                        {marker.sources.map((s) => (
                          <li key={s.name} className="text-sm text-on-surface-variant">
                            •{" "}
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                                {s.name}
                              </a>
                            ) : (
                              s.name
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Chat - always expanded */}
          <div className="rounded-xl bg-card p-4 elevation-1">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MessageCircle className="h-4 w-4" />
              </div>
              <span className="font-display font-medium text-card-foreground">Ask About This</span>
            </div>
            <MarkerChat marker={marker} />
          </div>
        </div>


        {/* QR Code & Marker Number */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6">
          <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Marker #{markers.indexOf(marker) + 1}
          </span>
          <div className="rounded-xl bg-white p-3 elevation-1">
            <QRCodeSVG
              value={marker.qrUrl || `https://remnant-project.lovable.app/marker/${marker.id}`}
              size={128}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              level="M"
            />
          </div>
          <span className="text-xs text-on-surface-variant">{marker.id}</span>
        </div>
      </div>
    </div>
  );
};

export default MarkerDetailPage;
