export interface Airport {
  code: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface Flight {
  flightNumber: string;
  airline: string;
  origin: Airport;
  destination: Airport;
  departureUTC: string;
  arrivalUTC: string;
  departureLocal: string;
  arrivalLocal: string;
  actualDepartureUTC?: string;
  actualArrivalUTC?: string;
  actualDepartureLocal?: string;
  actualArrivalLocal?: string;
}

export const airports: Record<string, Airport> = {
  SIN: { code: 'SIN', city: 'Singapur', country: 'Singapur', lat: 1.3644, lng: 103.9915 },
  DEL: { code: 'DEL', city: 'Nueva Delhi', country: 'India', lat: 28.5562, lng: 77.1000 },
  MUC: { code: 'MUC', city: 'Múnich', country: 'Alemania', lat: 48.3538, lng: 11.7861 },
  MAD: { code: 'MAD', city: 'Madrid', country: 'España', lat: 40.4936, lng: -3.5668 },
};

export const flights: Flight[] = [
  {
    flightNumber: 'AI 2116',
    airline: 'Air India',
    origin: airports.SIN,
    destination: airports.DEL,
    departureUTC: '2026-03-04T12:30:00Z',
    arrivalUTC: '2026-03-04T18:25:00Z',
    departureLocal: '4 Mar, 20:30 SGT',
    arrivalLocal: '4 Mar, 23:55 IST',
    actualDepartureUTC: '2026-03-04T12:42:00Z',
    actualArrivalUTC: '2026-03-04T18:18:00Z',
    actualDepartureLocal: '4 Mar, 20:42 SGT',
    actualArrivalLocal: '4 Mar, 23:48 IST',
  },
  {
    flightNumber: 'LH 763',
    airline: 'Lufthansa',
    origin: airports.DEL,
    destination: airports.MUC,
    departureUTC: '2026-03-04T20:25:00Z',
    arrivalUTC: '2026-03-05T05:00:00Z',
    departureLocal: '5 Mar, 01:55 IST',
    arrivalLocal: '5 Mar, 06:00 CET',
    actualDepartureUTC: '2026-03-04T20:38:00Z',
    actualArrivalUTC: '2026-03-05T05:12:00Z',
    actualDepartureLocal: '5 Mar, 02:08 IST',
    actualArrivalLocal: '5 Mar, 06:12 CET',
  },
  {
    flightNumber: 'LH 1804',
    airline: 'Lufthansa',
    origin: airports.MUC,
    destination: airports.MAD,
    departureUTC: '2026-03-05T13:55:00Z',
    arrivalUTC: '2026-03-05T16:40:00Z',
    departureLocal: '5 Mar, 14:55 CET',
    arrivalLocal: '5 Mar, 17:40 CET',
  },
];

export type FlightStatus = 'programado' | 'en-vuelo' | 'aterrizado';

export function getFlightStatus(flight: Flight, now: Date): FlightStatus {
  const dep = new Date(flight.departureUTC).getTime();
  const arr = new Date(flight.arrivalUTC).getTime();
  const current = now.getTime();
  if (current < dep) return 'programado';
  if (current <= arr) return 'en-vuelo';
  return 'aterrizado';
}

export function getFlightProgress(flight: Flight, now: Date): number {
  const dep = new Date(flight.departureUTC).getTime();
  const arr = new Date(flight.arrivalUTC).getTime();
  const current = now.getTime();
  if (current <= dep) return 0;
  if (current >= arr) return 100;
  return ((current - dep) / (arr - dep)) * 100;
}

export function interpolateGreatCircle(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  fraction: number,
): [number, number] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const p1 = toRad(lat1), l1 = toRad(lng1);
  const p2 = toRad(lat2), l2 = toRad(lng2);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((p1 - p2) / 2) ** 2 +
      Math.cos(p1) * Math.cos(p2) * Math.sin((l1 - l2) / 2) ** 2,
    ),
  );

  if (d === 0) return [lat1, lng1];

  const A = Math.sin((1 - fraction) * d) / Math.sin(d);
  const B = Math.sin(fraction * d) / Math.sin(d);

  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);

  return [
    toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    toDeg(Math.atan2(y, x)),
  ];
}

export function getGreatCirclePath(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  numPoints = 50,
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    points.push(interpolateGreatCircle(lat1, lng1, lat2, lng2, i / numPoints));
  }
  return points;
}

export function getCurrentPosition(flight: Flight, now: Date): [number, number] | null {
  const progress = getFlightProgress(flight, now) / 100;
  if (progress <= 0 || progress >= 1) return null;
  return interpolateGreatCircle(
    flight.origin.lat, flight.origin.lng,
    flight.destination.lat, flight.destination.lng,
    progress,
  );
}

export function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dl = toRad(lng2 - lng1);

  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function getJourneyStatus(now: Date): { text: string; type: 'waiting' | 'flying' | 'layover' | 'arrived' } {
  const statuses = flights.map(f => getFlightStatus(f, now));

  if (statuses.every(s => s === 'programado')) {
    return { text: 'Viaje aún no ha comenzado', type: 'waiting' };
  }

  if (statuses.every(s => s === 'aterrizado')) {
    return { text: 'Pilar ha llegado a Madrid!', type: 'arrived' };
  }

  const inFlightIdx = statuses.indexOf('en-vuelo');
  if (inFlightIdx >= 0) {
    const flight = flights[inFlightIdx];
    const progress = Math.round(getFlightProgress(flight, now));
    return {
      text: `En vuelo ${flight.flightNumber} hacia ${flight.destination.city} (${progress}%)`,
      type: 'flying',
    };
  }

  const lastLandedIdx = statuses.lastIndexOf('aterrizado');
  if (lastLandedIdx >= 0 && lastLandedIdx < flights.length - 1) {
    const city = flights[lastLandedIdx].destination.city;
    const nextFlight = flights[lastLandedIdx + 1];
    const nextDep = new Date(nextFlight.departureUTC);
    const diff = nextDep.getTime() - now.getTime();
    if (diff > 0) {
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return {
        text: `En ${city} — Próximo vuelo ${nextFlight.flightNumber} en ${hours}h ${mins}min`,
        type: 'layover',
      };
    }
  }

  return { text: 'En tránsito', type: 'layover' };
}
