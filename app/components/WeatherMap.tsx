"use client";

import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function WeatherMap({
  lat,
  lon,
  className = "",
}: {
  lat: number;
  lon: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <MapContainer
        center={[lat, lon]}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]} />
      </MapContainer>
    </div>
  );
}