"use client";

import { useEffect, useRef } from "react";
import { getOrCreatePlacesMap } from "@/lib/placesMapSingleton";

export type MapMarker = {
  lat: number;
  lng: number;
  title?: string;
};

type PlacesMapProps = {
  center: { lat: number; lng: number };
  zoom: number;
  marker: MapMarker | null;
};

export function PlacesMap({ center, zoom, marker }: PlacesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const markerPropRef = useRef(marker);
  centerRef.current = center;
  zoomRef.current = zoom;
  markerPropRef.current = marker;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;

    void getOrCreatePlacesMap(container, {
      center: centerRef.current,
      zoom: zoomRef.current,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "cooperative",
    })
      .then((map) => {
        if (cancelled || containerRef.current !== container) return;

        mapRef.current = map;

        const initialMarker = markerPropRef.current;
        if (initialMarker && !markerRef.current) {
          markerRef.current = new google.maps.Marker({
            map,
            position: { lat: initialMarker.lat, lng: initialMarker.lng },
            title: initialMarker.title,
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [center, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps?.Marker) return;

    if (!marker) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    const position = { lat: marker.lat, lng: marker.lng };

    if (markerRef.current) {
      markerRef.current.setPosition(position);
      if (marker.title) markerRef.current.setTitle(marker.title);
      return;
    }

    markerRef.current = new google.maps.Marker({
      map,
      position,
      title: marker.title,
    });
  }, [marker]);

  return <div ref={containerRef} className="vireon-map-viewer" />;
}
