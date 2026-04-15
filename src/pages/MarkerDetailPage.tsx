import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, MessageCircle, FileText, Check, MapPin } from "lucide-react";
import { markers } from "@/data/mockData";
import { QRCodeSVG } from "qrcode.react";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";
import { useVisited } from "@/hooks/useVisited";
import MarkerChat from "@/components/MarkerChat";

const images: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

const MarkerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const marker = markers.find((m) => m.id === id);
  const { isVisited, toggle: toggleVisited } = useVisited();
  const visited = id ? isVisited(id) : false;
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  if (!marker) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h2 className="font-display text-lg font-bold text-foreground">Marker Not Found</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          This marker doesn't exist or the code is incorrect.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-lg bg-foreground px-8 py-3 font-display text-sm font-semibold text-background"
        >
          Go Home
        </button>
      </div>
    );
  }

  const toggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    { key: "summary", icon: BookOpen, label: "Summary" },
    { key: "sources", icon: FileText, label: "Sources" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Hero */}
      <div className="relative h-64">
        <img
          src={images[marker.image] || unionStation}
          alt={marker.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-transform hover:scale-105"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Marker Details</span>
          <h1 className="font-display text-2xl font-bold text-white">{marker.name}</h1>
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* Address chip */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-surface-variant px-3 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm text-foreground">{marker.address}</span>
        </div>

        {/* Visit button */}
        <button
          onClick={() => id && toggleVisited(id)}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-display text-sm font-semibold transition-all ${
            visited
              ? "border border-border bg-background text-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {visited ? <Check className="h-4 w-4" /> : null}
          {visited ? "Visited" : "Mark as Visited"}
        </button>

        {/* Accordion */}
        <div className="mt-6 space-y-2">
          {sections.map(({ key, icon: Icon, label }) => (
            <div key={key}>
              <button
                onClick={() => toggle(key)}
                className={`flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all ${
                  expandedSection === key ? "bg-surface-variant" : "bg-card elevation-1"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    expandedSection === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-variant text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-display font-semibold text-foreground">{label}</span>
              </button>
              {expandedSection === key && (
                <div className="animate-fade-in mt-1 rounded-xl bg-card px-4 pb-4 pt-3 elevation-1">
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
          ))}
        </div>

        {/* Chat */}
        <div className="mt-6 rounded-xl bg-card p-4 elevation-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="font-display font-semibold text-foreground">Ask About This</span>
          </div>
          <MarkerChat marker={marker} />
        </div>

        {/* QR Code & Marker Number */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Marker #{markers.indexOf(marker) + 1}
          </span>
          <div className="rounded-xl bg-white p-3 elevation-1">
            <QRCodeSVG
              value={marker.qrUrl || `https://remnant-project.lovable.app/marker/${marker.id}`}
              size={128}
              bgColor="#ffffff"
              fgColor="#222222"
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
