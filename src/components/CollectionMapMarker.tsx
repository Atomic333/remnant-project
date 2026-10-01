import { forwardRef, type MouseEvent } from "react";
import { OverlayView } from "@react-google-maps/api";
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
const CollectionMapMarker = forwardRef<HTMLButtonElement, Props>(({ lat, lng, title, selected, motion = true, onClick }, ref) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick();
  };

  return (
  <OverlayView
    position={{ lat, lng }}
    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    getPixelPositionOffset={(width, height) => ({ x: -width / 2, y: -height })}
  >
    <button
      ref={ref}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={selected}
      onClick={handleClick}
      className={`collection-map-pin ${motion ? "collection-map-pin-motion" : ""} ${selected ? "collection-map-pin-selected" : ""}`}
    >
      <span className="collection-map-pin-visual" aria-hidden>
        <span className="collection-map-pin-halo" />
        <img src={markerIconAsset.url} alt="" />
      </span>
    </button>
  </OverlayView>
  );
});

CollectionMapMarker.displayName = "CollectionMapMarker";

export default CollectionMapMarker;