import { useState, useEffect } from "react";
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
  const [storyLoaded, setStoryLoaded] = useState(false);

  useEffect(() => {
    if (expandedSection === "story" && !storyLoaded) {
      const timer = setTimeout(() => setStoryLoaded(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [expandedSection, storyLoaded]);

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
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    { key: "summary", icon: BookOpen, label: "Summary" },
    { key: "story", icon: Sparkles, label: "The Story" },
    { key: "sources", icon: FileText, label: "Sources" },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <div className="relative h-60">
        <img
          src={images[marker.image] || unionStation}
          alt={marker.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-transparent to-foreground/20" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <span className="text-xs font-medium text-primary-foreground/80">Marker Details</span>
          <h1 className="font-display text-2xl font-medium text-primary-foreground">{marker.name}</h1>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* Address chip */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-surface-variant px-3 py-2">
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
        <div className="mt-6 space-y-2">
          {sections.map(({ key, icon: Icon, label }) => (
            <div key={key}>
              <button
                onClick={() => toggle(key)}
                className={`flex w-full items-center gap-3 rounded-xl p-4 text-left transition-colors ${
                  expandedSection === key ? "bg-secondary" : "bg-card elevation-1"
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  expandedSection === key ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-display font-medium text-card-foreground">{label}</span>
              </button>
              {expandedSection === key && (
                <div className="animate-fade-in mt-1 rounded-xl bg-card px-4 pb-4 pt-3 elevation-1">
                  {key === "summary" && (
                    <p className="text-sm leading-relaxed text-on-surface-variant">{marker.summary}</p>
                  )}
                  {key === "story" && (
                    !storyLoaded ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                          Generating story…
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-on-surface-variant">{marker.story}</p>
                    )
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

        {/* QR Code & Marker Number */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6">
          <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Marker #{markers.indexOf(marker) + 1}
          </span>
          <div className="rounded-xl bg-white p-3 elevation-1">
            <QRCodeSVG
              value={marker.qrUrl || `https://markerquest.app/m/tacoma_wa/${marker.id}`}
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
