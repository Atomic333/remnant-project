import { OverlayView, OverlayViewF } from "@react-google-maps/api";
import markerIconAsset from "@/assets/marker-icon.png.asset.json";

interface Props {
  lat: number;
  lng: number;
  title: string;
  selected?: boolean;
  motion?: boolean;
  onClick: () => void;
}

/** The standard MarkerQuest pin with a collection-only gold halo and restrained sway. */
const CollectionMapMarker = ({ lat, lng, title, selected, motion = true, onClick }: Props) => (
  <OverlayViewF
    position={{ lat, lng }}
    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    getPixelPositionOffset={(width, height) => ({ x: -width / 2, y: -height })}
  >
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={selected}
      onClick={onClick}
      className={`collection-map-pin ${motion ? "collection-map-pin-motion" : ""} ${selected ? "collection-map-pin-selected" : ""}`}
    >
      <span className="collection-map-pin-halo" />
      <img src={markerIconAsset.url} alt="" aria-hidden />
    </button>
  </OverlayViewF>
);

export default CollectionMapMarker;