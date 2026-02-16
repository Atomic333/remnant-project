import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Sparkles, FileText, Check, MapPin } from "lucide-react";
import { markers } from "@/data/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";

const images: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

const MarkerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const marker = markers.find((m) => m.id === id);
  const [visited, setVisited] = useState(marker?.visited ?? false);
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
        <h2 className="text-lg font-semibold text-foreground">Marker Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This marker doesn't exist or the code is incorrect.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    );
  }

  const toggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <div className="relative h-56">
        <img
          src={images[marker.image] || unionStation}
          alt={marker.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-card/80 p-2 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="text-xs font-medium text-primary-foreground/80">Marker Details</span>
          <h1 className="text-2xl font-bold text-primary-foreground">{marker.name}</h1>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Address */}
        <div className="mb-4 flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="text-sm">{marker.address}</span>
        </div>

        {/* Visit button */}
        <button
          onClick={() => setVisited(!visited)}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-colors ${
            visited
              ? "bg-success text-success-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {visited ? <Check className="h-4 w-4" /> : null}
          {visited ? "Visited" : "Mark as Visited"}
        </button>

        {/* Accordion sections */}
        <div className="mt-6 space-y-2">
          {/* Summary */}
          <button
            onClick={() => toggle("summary")}
            className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-card-foreground">Summary</span>
          </button>
          {expandedSection === "summary" && (
            <div className="animate-fade-in rounded-lg bg-card px-4 pb-4 pt-1">
              <p className="text-sm leading-relaxed text-muted-foreground">{marker.summary}</p>
            </div>
          )}

          {/* Story */}
          <button
            onClick={() => toggle("story")}
            className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-card-foreground">The Story</span>
          </button>
          {expandedSection === "story" && (
            <div className="animate-fade-in rounded-lg bg-card px-4 pb-4 pt-1">
              {!storyLoaded ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                    Generating story…
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">{marker.story}</p>
              )}
            </div>
          )}

          {/* Sources */}
          <button
            onClick={() => toggle("sources")}
            className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left"
          >
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold text-card-foreground">Sources</span>
          </button>
          {expandedSection === "sources" && (
            <div className="animate-fade-in rounded-lg bg-card px-4 pb-4 pt-1">
              <ul className="space-y-1">
                {marker.sources.map((s) => (
                  <li key={s} className="text-sm text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkerDetailPage;