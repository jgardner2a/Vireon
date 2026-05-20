import { getGoogleGeocoder } from "./googleGeocoder";

export type SearchLocation = {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  locationType?: string;
};

const US_VIEW = { lat: 39.5, lng: -98.35 };
export const DEFAULT_MAP_CENTER = US_VIEW;
export const DEFAULT_MAP_ZOOM = 4;

/** Zoom 10–15 based on geocoder precision. */
export function zoomForLocationType(locationType?: string): number {
  switch (locationType) {
    case "ROOFTOP":
    case "RANGE_INTERPOLATED":
      return 15;
    case "GEOMETRIC_CENTER":
      return 13;
    case "APPROXIMATE":
      return 10;
    default:
      return 12;
  }
}

function nameFromGeocoderResult(result: google.maps.GeocoderResult): string {
  const components = result.address_components;
  if (components?.length) {
    const locality = components.find((c) =>
      c.types.includes("locality")
    )?.long_name;
    const neighborhood = components.find((c) =>
      c.types.includes("neighborhood")
    )?.long_name;
    const state = components.find((c) =>
      c.types.includes("administrative_area_level_1")
    )?.short_name;
    const primary = locality ?? neighborhood;
    if (primary && state) return `${primary}, ${state}`;
    if (primary) return primary;
  }

  const first = result.formatted_address.split(",")[0]?.trim();
  return first || result.formatted_address;
}

/** Geocode a free-text query via Google Maps Geocoder (real-world locations). */
export async function geocodeQuery(query: string): Promise<SearchLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const geocoder = await getGoogleGeocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { address: trimmed },
      (results, status) => {
        if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
          resolve([]);
          return;
        }

        if (status !== google.maps.GeocoderStatus.OK || !results?.length) {
          reject(new Error(status));
          return;
        }

        resolve(
          results.map((result, index) => {
            const loc = result.geometry.location;
            return {
              id: result.place_id ?? `geocode-${index}`,
              name: nameFromGeocoderResult(result),
              formattedAddress: result.formatted_address,
              lat: loc.lat(),
              lng: loc.lng(),
              locationType: result.geometry.location_type,
            };
          })
        );
      }
    );
  });
}
