"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

type WeatherMapProps = {
  latitude: number;
  longitude: number;
  onSelect: (latitude: number, longitude: number) => void;
};

const markerIcon = L.divIcon({
  className: "weather-marker",
  html: "<span aria-hidden=\"true\"></span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function WeatherMap({ latitude, longitude, onSelect }: WeatherMapProps) {
  return (
    <MapContainer className="map" center={[latitude, longitude]} zoom={10} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onSelect={onSelect} />
      <MapCenter latitude={latitude} longitude={longitude} />
      <Marker position={[latitude, longitude]} icon={markerIcon} />
    </MapContainer>
  );
}

function MapClickHandler({ onSelect }: Pick<WeatherMapProps, "onSelect">) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapCenter({ latitude, longitude }: Pick<WeatherMapProps, "latitude" | "longitude">) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
  }, [latitude, longitude, map]);

  return null;
}
