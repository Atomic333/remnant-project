import { useState } from "react";
import { markers } from "@/data/markers";
import PageHeader from "@/components/PageHeader";
import MarkerCard from "@/components/MarkerCard";
import { useVisited } from "@/hooks/useVisited";

const tabs = ["All", "Visited", "To See"];

const ProgressPage = () => {
  const [activeTab, setActiveTab] = useState("All");
  const { visited: visitedSet } = useVisited();

  const visitedCount = markers.filter((m) => visitedSet.has(m.id)).length;
  const pct = Math.round((visitedCount / markers.length) * 100);

  const filtered = markers.filter((m) => {
    if (activeTab === "Visited") return visitedSet.has(m.id);
    if (activeTab === "To See") return !visitedSet.has(m.id);
    return true;
  });

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Progress" />

      <div className="px-5 pt-4">
        {/* Stats card */}
        <div className="rounded-xl bg-card p-4 elevation-1">
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
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Segmented tabs */}
        <div className="mt-6 flex rounded-xl border border-border">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors
                ${i === 0 ? "rounded-l-xl" : ""} ${i === tabs.length - 1 ? "rounded-r-xl" : ""}
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
        <div className="mt-4 space-y-2">
          {filtered.map((m) => (
            <MarkerCard key={m.id} marker={m} />
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-on-surface-variant">
              No markers in this category yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
