'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  flights,
  getFlightStatus,
  getFlightProgress,
  getCurrentPosition,
  getBearing,
  type FlightStatus,
} from '@/lib/flights';
import { type Lang, getTranslations } from '@/lib/i18n';

const FlightMap = dynamic(() => import('./FlightMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] sm:h-[450px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
      ...
    </div>
  ),
});

const statusColors: Record<FlightStatus, string> = {
  programado: 'bg-gray-100 text-gray-600',
  'en-vuelo': 'bg-blue-100 text-blue-700',
  aterrizado: 'bg-green-100 text-green-700',
};

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function computeTimes() {
  const firstDep = new Date(flights[0].departureUTC).getTime();
  const lastArr = new Date(flights[flights.length - 1].arrivalUTC).getTime();
  const totalTime = lastArr - firstDep;

  let airTime = 0;
  for (const f of flights) {
    airTime += new Date(f.arrivalUTC).getTime() - new Date(f.departureUTC).getTime();
  }

  const waitTime = totalTime - airTime;
  return { totalTime, airTime, waitTime };
}

export default function FlightTracker() {
  const [now, setNow] = useState<Date | null>(null);
  const [lang, setLang] = useState<Lang>('es');

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const t = getTranslations(lang);
  const statusLabels: Record<FlightStatus, string> = {
    programado: t.scheduled,
    'en-vuelo': t.inFlight,
    aterrizado: t.landed,
  };

  if (!now) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">{t.loading}</p>
      </div>
    );
  }

  const flightsWithStatus = flights.map((flight) => ({
    flight,
    status: getFlightStatus(flight, now),
    progress: getFlightProgress(flight, now),
  }));

  // Journey status
  const statuses = flights.map(f => getFlightStatus(f, now));
  let journeyStatus: { text: string; type: 'waiting' | 'flying' | 'layover' | 'arrived' };

  if (statuses.every(s => s === 'programado')) {
    journeyStatus = { text: t.journeyNotStarted, type: 'waiting' };
  } else if (statuses.every(s => s === 'aterrizado')) {
    journeyStatus = { text: t.arrived, type: 'arrived' };
  } else {
    const inFlightIdx = statuses.indexOf('en-vuelo');
    if (inFlightIdx >= 0) {
      const flight = flights[inFlightIdx];
      const progress = Math.round(getFlightProgress(flight, now));
      const city = t.cities[flight.destination.code] || flight.destination.city;
      journeyStatus = { text: t.flyingTo(flight.flightNumber, city, progress), type: 'flying' };
    } else {
      const lastLandedIdx = statuses.lastIndexOf('aterrizado');
      if (lastLandedIdx >= 0 && lastLandedIdx < flights.length - 1) {
        const city = t.cities[flights[lastLandedIdx].destination.code] || flights[lastLandedIdx].destination.city;
        const nextFlight = flights[lastLandedIdx + 1];
        const nextDep = new Date(nextFlight.departureUTC);
        const diff = nextDep.getTime() - now.getTime();
        if (diff > 0) {
          const hours = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          journeyStatus = { text: t.layoverAt(city, nextFlight.flightNumber, hours, mins), type: 'layover' };
        } else {
          journeyStatus = { text: t.inTransit, type: 'layover' };
        }
      } else {
        journeyStatus = { text: t.inTransit, type: 'layover' };
      }
    }
  }

  // Plane position
  let planePosition: [number, number] | null = null;
  let planeBearing = 0;
  const activeFlight = flightsWithStatus.find((f) => f.status === 'en-vuelo');
  if (activeFlight) {
    planePosition = getCurrentPosition(activeFlight.flight, now);
    planeBearing = getBearing(
      activeFlight.flight.origin.lat,
      activeFlight.flight.origin.lng,
      activeFlight.flight.destination.lat,
      activeFlight.flight.destination.lng,
    );
  }

  // Overall journey progress
  const totalLegs = flights.length;
  const completedLegs = flightsWithStatus.filter((f) => f.status === 'aterrizado').length;
  const activeProgress = activeFlight ? activeFlight.progress / 100 : 0;
  const overallProgress = ((completedLegs + activeProgress) / totalLegs) * 100;

  // Time counters
  const { totalTime, airTime, waitTime } = computeTimes();

  const statusBannerColors = {
    waiting: 'from-gray-500 to-gray-600',
    flying: 'from-blue-500 to-blue-700',
    layover: 'from-amber-500 to-amber-600',
    arrived: 'from-green-500 to-green-600',
  };

  const timeLocale = lang === 'de' ? 'de-DE' : 'es-ES';
  const cityName = (code: string, fallback: string) => t.cities[code] || fallback;
  const countryName = (code: string, fallback: string) => t.countries[code] || fallback;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-slate-300 mt-1 text-sm sm:text-base">{t.route}</p>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              {t.currentTime} {now.toLocaleString(timeLocale, { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' })} (Madrid)
            </p>
          </div>
          {/* Language Switcher */}
          <div className="flex gap-1 bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setLang('es')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                lang === 'es' ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white'
              }`}
            >
              ES
            </button>
            <button
              onClick={() => setLang('de')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                lang === 'de' ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white'
              }`}
            >
              DE
            </button>
          </div>
        </div>
      </header>

      {/* Status Banner */}
      <div className={`bg-gradient-to-r ${statusBannerColors[journeyStatus.type]} text-white`}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl">
            {journeyStatus.type === 'flying' ? '\u2708\uFE0F' : journeyStatus.type === 'arrived' ? '\uD83C\uDF89' : journeyStatus.type === 'layover' ? '\uD83D\uDEEB' : '\u23F3'}
          </span>
          <span className="font-medium text-sm sm:text-base">{journeyStatus.text}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Time Counters */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 text-center">
            <div className="text-xs sm:text-sm text-slate-500 mb-1">{t.totalTime}</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-800">{formatDuration(totalTime)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-3 sm:p-4 text-center">
            <div className="text-xs sm:text-sm text-blue-500 mb-1">{t.airTime}</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-700">{formatDuration(airTime)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-3 sm:p-4 text-center">
            <div className="text-xs sm:text-sm text-amber-500 mb-1">{t.waitTime}</div>
            <div className="text-lg sm:text-2xl font-bold text-amber-700">{formatDuration(waitTime)}</div>
          </div>
        </div>

        {/* Journey Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-slate-600">{t.journeyProgress}</span>
            <span className="text-sm text-slate-500">{Math.round(overallProgress)}%</span>
          </div>
          {(() => {
            const firstDep = new Date(flights[0].departureUTC).getTime();
            const lastArr = new Date(flights[flights.length - 1].arrivalUTC).getTime();
            const nowMs = now.getTime();
            const notStarted = nowMs < firstDep;
            const done = nowMs >= lastArr;
            const elapsed = notStarted ? 0 : done ? lastArr - firstDep : nowMs - firstDep;
            const remaining = notStarted ? lastArr - firstDep : done ? 0 : lastArr - nowMs;
            return (
              <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                <span>
                  {t.elapsed}: {notStarted ? <span className="italic">{t.notStarted}</span> : <span className="text-slate-600 font-medium">{formatDuration(elapsed)}</span>}
                </span>
                <span>
                  {t.remaining}: {done ? <span className="text-green-600 font-medium">{t.finished}</span> : <span className="text-slate-600 font-medium">{formatDuration(remaining)}</span>}
                </span>
              </div>
            );
          })()}
          <div className="relative">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${overallProgress}%`,
                  background: journeyStatus.type === 'arrived'
                    ? '#16a34a'
                    : 'linear-gradient(90deg, #16a34a, #2563eb)',
                }}
              />
            </div>
            {/* Airport dots on progress bar */}
            <div className="flex justify-between mt-2">
              {['SIN', 'DEL', 'MUC', 'MAD'].map((code, i) => {
                const position = (i / 3) * 100;
                const isPast = overallProgress >= position;
                return (
                  <div key={code} className="flex flex-col items-center" style={{ width: '50px' }}>
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        isPast ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'
                      }`}
                    />
                    <span className={`text-xs mt-1 font-medium ${isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                      {code}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-[300px] sm:h-[450px]">
            <FlightMap
              flights={flightsWithStatus.map(({ flight, status }) => ({ flight, status }))}
              planePosition={planePosition}
              planeBearing={planeBearing}
              lang={lang}
            />
          </div>
        </div>

        {/* Flight Cards (mobile) */}
        <div className="sm:hidden space-y-3">
          <h2 className="text-lg font-semibold text-slate-800 px-1">{t.flightDetails}</h2>
          {flightsWithStatus.map(({ flight, status, progress }, i) => (
            <div key={flight.flightNumber} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs text-slate-400 mr-2">{t.leg} {i + 1}</span>
                  <span className="font-semibold text-slate-800">{flight.flightNumber}</span>
                  <span className="text-xs text-slate-400 ml-2">{flight.airline}</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                  {status === 'en-vuelo' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />}
                  {status === 'aterrizado' && <span className="mr-1">&check;</span>}
                  {statusLabels[status]}
                  {status === 'en-vuelo' && <span className="ml-1">{Math.round(progress)}%</span>}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="text-center">
                  <div className="font-bold text-slate-700 text-lg">{flight.origin.code}</div>
                  <div className="text-xs text-slate-400">{cityName(flight.origin.code, flight.origin.city)}</div>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-slate-200 relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-slate-300 bg-white px-1 text-xs">&rarr;</span>
                </div>
                <div className="text-center">
                  <div className="font-bold text-slate-700 text-lg">{flight.destination.code}</div>
                  <div className="text-xs text-slate-400">{cityName(flight.destination.code, flight.destination.city)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-500">
                <div><span className="text-slate-400">{t.departure}:</span> {flight.departureLocal}</div>
                <div><span className="text-slate-400">{t.arrival}:</span> {flight.arrivalLocal}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Flight Table (desktop) */}
        <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">{t.flightDetails}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">{t.flight}</th>
                  <th className="px-5 py-3 font-medium">{t.routeCol}</th>
                  <th className="px-5 py-3 font-medium">{t.departure}</th>
                  <th className="px-5 py-3 font-medium">{t.arrival}</th>
                  <th className="px-5 py-3 font-medium">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {flightsWithStatus.map(({ flight, status, progress }, i) => (
                  <tr key={flight.flightNumber} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-slate-400">{i + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{flight.flightNumber}</div>
                      <div className="text-xs text-slate-400">{flight.airline}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-700">{flight.origin.code}</span>
                      <span className="text-slate-400 mx-2">&rarr;</span>
                      <span className="font-medium text-slate-700">{flight.destination.code}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{flight.departureLocal}</td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{flight.arrivalLocal}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                          {status === 'en-vuelo' && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />
                          )}
                          {status === 'aterrizado' && <span className="mr-1">&check;</span>}
                          {statusLabels[status]}
                        </span>
                        {status === 'en-vuelo' && (
                          <span className="text-xs text-blue-500 font-medium">{Math.round(progress)}%</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          {t.footer}
        </p>
      </div>
    </div>
  );
}
