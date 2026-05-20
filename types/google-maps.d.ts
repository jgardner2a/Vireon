/** Minimal Google Maps JS API types for map + geocoding search. */
declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
    panTo(latLng: LatLngLiteral): void;
    setCenter(latLng: LatLngLiteral): void;
    setZoom(zoom: number): void;
    getZoom(): number;
    addListener(eventName: string, handler: () => void): MapsEventListener;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latLng: LatLngLiteral): void;
    setTitle(title: string): void;
  }

  class Geocoder {
    geocode(
      request: GeocoderRequest,
      callback: (
        results: GeocoderResult[] | null,
        status: GeocoderStatus
      ) => void
    ): void;
  }

  interface MapsEventListener {
    remove(): void;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
  }

  interface MarkerOptions {
    map?: Map;
    position?: LatLngLiteral;
    title?: string;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface LatLng {
    lat(): number;
    lng(): number;
  }

  interface GeocoderRequest {
    address?: string;
  }

  interface GeocoderResult {
    formatted_address: string;
    place_id?: string;
    geometry: {
      location: LatLng;
      location_type?: string;
    };
    address_components?: GeocoderAddressComponent[];
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  enum GeocoderStatus {
    OK = "OK",
    ZERO_RESULTS = "ZERO_RESULTS",
    OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
    REQUEST_DENIED = "REQUEST_DENIED",
    INVALID_REQUEST = "INVALID_REQUEST",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
  }
}

interface Window {
  google?: {
    maps: typeof google.maps;
  };
  __vireonGoogleMapsLoadPromise?: Promise<void>;
  __vireonGoogleMapsInit?: () => void;
  __vireonGoogleMapsGeocoder?: google.maps.Geocoder;
}
