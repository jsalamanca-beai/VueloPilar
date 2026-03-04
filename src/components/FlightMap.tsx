'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Flight, FlightStatus, getGreatCirclePath } from '@/lib/flights';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface FlightWithStatus {
  flight: Flight;
  status: FlightStatus;
}

interface FlightMapProps {
  flights: FlightWithStatus[];
  planePosition: [number, number] | null;
  planeBearing: number;
}

function createPlaneIcon(bearing: number) {
  return L.divIcon({
    html: `<svg viewBox="0 0 24 24" width="32" height="32" style="transform: rotate(${bearing}deg); filter: drop-shadow(1px 2px 3px rgba(0,0,0,0.4));">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#dc2626"/>
    </svg>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const routeColors: Record<FlightStatus, string> = {
  aterrizado: '#16a34a',
  'en-vuelo': '#2563eb',
  programado: '#9ca3af',
};

function FitBounds({ flights }: { flights: FlightWithStatus[] }) {
  const map = useMap();
  useEffect(() => {
    const allPoints: [number, number][] = [];
    flights.forEach(({ flight }) => {
      allPoints.push([flight.origin.lat, flight.origin.lng]);
      allPoints.push([flight.destination.lat, flight.destination.lng]);
    });
    if (allPoints.length > 0) {
      map.fitBounds(allPoints as L.LatLngBoundsExpression, { padding: [40, 40] });
    }
  }, [flights, map]);
  return null;
}

export default function FlightMap({ flights, planePosition, planeBearing }: FlightMapProps) {
  // Collect unique airports
  const airportMap = new Map<string, Flight['origin']>();
  flights.forEach(({ flight }) => {
    airportMap.set(flight.origin.code, flight.origin);
    airportMap.set(flight.destination.code, flight.destination);
  });
  const uniqueAirports = Array.from(airportMap.values());

  return (
    <MapContainer
      center={[30, 50]}
      zoom={3}
      className="w-full h-full"
      scrollWheelZoom={true}
      style={{ borderRadius: '0.75rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds flights={flights} />

      {/* Route lines */}
      {flights.map(({ flight, status }) => {
        const path = getGreatCirclePath(
          flight.origin.lat, flight.origin.lng,
          flight.destination.lat, flight.destination.lng,
        );
        return (
          <Polyline
            key={flight.flightNumber}
            positions={path}
            pathOptions={{
              color: routeColors[status],
              weight: status === 'en-vuelo' ? 3.5 : 2.5,
              dashArray: status === 'programado' ? '10 6' : undefined,
              opacity: status === 'programado' ? 0.5 : 0.85,
            }}
          />
        );
      })}

      {/* Airport markers */}
      {uniqueAirports.map((airport) => (
        <CircleMarker
          key={airport.code}
          center={[airport.lat, airport.lng]}
          radius={7}
          pathOptions={{
            color: '#1e3a5f',
            fillColor: '#3b82f6',
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]} className="airport-tooltip">
            {airport.code}
          </Tooltip>
          <Popup>
            <strong>{airport.code}</strong><br />
            {airport.city}, {airport.country}
          </Popup>
        </CircleMarker>
      ))}

      {/* Plane marker */}
      {planePosition && (
        <Marker position={planePosition} icon={createPlaneIcon(planeBearing)}>
          <Popup>Pilar va por aquí</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
