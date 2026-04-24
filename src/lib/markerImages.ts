import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";

// Marker photos - real images from Wikipedia/HMDB/official sites where available,
// AI-generated period-appropriate imagery for markers without verified photos (022, 025, 026)
import m001 from "@/assets/markers/marker-001.jpg";
import m002 from "@/assets/markers/marker-002.jpg";
import m003 from "@/assets/markers/marker-003.jpg";
import m004 from "@/assets/markers/marker-004.jpg";
import m005 from "@/assets/markers/marker-005.jpg";
import m006 from "@/assets/markers/marker-006.jpg";
import m007 from "@/assets/markers/marker-007.jpg";
import m008 from "@/assets/markers/marker-008.jpg";
import m009 from "@/assets/markers/marker-009.jpg";
import m010 from "@/assets/markers/marker-010.jpg";
import m011 from "@/assets/markers/marker-011.jpg";
import m012 from "@/assets/markers/marker-012.jpg";
import m013 from "@/assets/markers/marker-013.jpg";
import m014 from "@/assets/markers/marker-014.jpg";
import m015 from "@/assets/markers/marker-015.jpg";
import m016 from "@/assets/markers/marker-016.jpg";
import m017 from "@/assets/markers/marker-017.jpg";
import m018 from "@/assets/markers/marker-018.jpg";
import m019 from "@/assets/markers/marker-019.jpg";
import m020 from "@/assets/markers/marker-020.jpg";
import m021 from "@/assets/markers/marker-021.jpg";
import m022 from "@/assets/markers/marker-022.jpg";
import m023 from "@/assets/markers/marker-023.jpg";
import m024 from "@/assets/markers/marker-024.jpg";
import m025 from "@/assets/markers/marker-025.jpg";
import m026 from "@/assets/markers/marker-026.jpg";
import m027 from "@/assets/markers/marker-027.jpg";
import m028 from "@/assets/markers/marker-028.jpg";

const byId: Record<string, string> = {
  "marker-001": m001, "marker-002": m002, "marker-003": m003, "marker-004": m004,
  "marker-005": m005, "marker-006": m006, "marker-007": m007, "marker-008": m008,
  "marker-009": m009, "marker-010": m010, "marker-011": m011, "marker-012": m012,
  "marker-013": m013, "marker-014": m014, "marker-015": m015, "marker-016": m016,
  "marker-017": m017, "marker-018": m018, "marker-019": m019, "marker-020": m020,
  "marker-021": m021, "marker-022": m022, "marker-023": m023, "marker-024": m024,
  "marker-025": m025, "marker-026": m026, "marker-027": m027, "marker-028": m028,
};

const byKey: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

export function getMarkerImage(id: string, fallbackKey?: string): string {
  return byId[id] || (fallbackKey && byKey[fallbackKey]) || unionStation;
}
