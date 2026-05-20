import { loadGoogleMapsScript } from "./googleMapsLoader";

type PlacesMapState = {
  map: google.maps.Map;
  container: HTMLElement;
};

let placesMapState: PlacesMapState | null = null;

/**
 * One Map instance per container element; reused across React Strict Mode remounts
 * when the same DOM node is preserved, and replaced only when the container changes.
 */
export async function getOrCreatePlacesMap(
  container: HTMLElement,
  options: google.maps.MapOptions
): Promise<google.maps.Map> {
  await loadGoogleMapsScript();

  if (!window.google?.maps?.Map) {
    throw new Error("maps_unavailable");
  }

  if (
    placesMapState &&
    placesMapState.container === container &&
    placesMapState.map
  ) {
    return placesMapState.map;
  }

  const map = new google.maps.Map(container, options);
  placesMapState = { map, container };
  return map;
}

export function disposePlacesMap(): void {
  placesMapState = null;
}
