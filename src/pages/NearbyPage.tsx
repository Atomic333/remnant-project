import { useState } from "react";
import { X } from "lucide-react";
import { markers, categories } from "@/data/mockData";
import FilterChips from "@/components/FilterChips";
import MarkerCard from "@/components/MarkerCard";
import PageHeader from "@/components/PageHeader";

const NearbyPage = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [locationEnabled] = useState(true);

  const filtered = markers
    .filter((m) => activeFilter === "All" || m.category === activeFilter)
    .sort((a, b) => parseFloat(a.distance || "0") - parseFloat(b.distance || "0"));

  if (!locationEnabled) {
    return (
      <div className="min-h-screen pb-20">
        <PageHeader title="Tacoma Markers" />
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <X className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Location Disabled</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enable location in Settings to see nearby markers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Tacoma Markers" />
      <div className="px-4 py-3">
        <FilterChips categories={categories} active={activeFilter} onChange={setActiveFilter} />
      </div>
      <div className="space-y-1 px-4">
        {filtered.map((m) => (
          <MarkerCard key={m.id} marker={m} showDistance />
        ))}
      </div>
    </div>
  );
};

export default NearbyPage;
