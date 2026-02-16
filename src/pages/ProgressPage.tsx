import { useState } from "react";
import { markers } from "@/data/mockData";
import PageHeader from "@/components/PageHeader";
import MarkerCard from "@/components/MarkerCard";

const tabs = ["All", "Visited", "To See"];

const ProgressPage = () => {
  const [activeTab, setActiveTab] = useState("All");
  const visited = markers.filter((m) => m.visited).length;

  const filtered = markers.filter((m) => {
    if (activeTab === "Visited") return m.visited;
    if (activeTab === "To See") return !m.visited;
    return true;
  });

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Progress" back />

      <div className="px-4 pt-4">
        {/* Stats */}
        <h2 className="text-2xl font-bold text-foreground">
          {visited}/{markers.length} Markers Visited
        </h2>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(visited / markers.length) * 100}%` }}
          />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-4 space-y-1">
          {filtered.map((m) => (
            <MarkerCard key={m.id} marker={m} />
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No markers in this category yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
