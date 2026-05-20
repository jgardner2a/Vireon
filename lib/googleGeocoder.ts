import { loadGoogleMapsScript } from "./googleMapsLoader";

const GLOBAL_GEOCODER_KEY = "__vireonGoogleMapsGeocoder";

type VireonGeocoderWindow = Window & {
  [GLOBAL_GEOCODER_KEY]?: google.maps.Geocoder;
};

/**
 * Returns a single persistent Geocoder for the page lifetime.
 * Never call `new google.maps.Geocoder()` elsewhere.
 */
export async function getGoogleGeocoder(): Promise<google.maps.Geocoder> {
  await loadGoogleMapsScript();

  if (!window.google?.maps?.Geocoder) {
    throw new Error("geocoder_unavailable");
  }

  const win = window as VireonGeocoderWindow;
  if (!win[GLOBAL_GEOCODER_KEY]) {
    win[GLOBAL_GEOCODER_KEY] = new google.maps.Geocoder();
  }

  return win[GLOBAL_GEOCODER_KEY];
}
