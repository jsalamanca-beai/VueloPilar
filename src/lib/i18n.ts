export type Lang = 'es' | 'de';

const translations = {
  es: {
    title: '¿Dónde está Pilar?',
    route: 'Singapur → Nueva Delhi → Múnich → Madrid',
    currentTime: 'Hora actual:',
    loading: 'Cargando...',
    loadingMap: 'Cargando mapa...',
    journeyProgress: 'Progreso del viaje',
    flightDetails: 'Detalle de vuelos',
    leg: 'Tramo',
    flight: 'Vuelo',
    routeCol: 'Ruta',
    departure: 'Salida',
    arrival: 'Llegada',
    status: 'Estado',
    scheduled: 'Programado',
    inFlight: 'En vuelo',
    landed: 'Aterrizado',
    footer: 'Actualizado cada 30 segundos · Los horarios son estimados',
    journeyNotStarted: 'Viaje aún no ha comenzado',
    arrived: '¡Pilar ha llegado a Madrid!',
    flyingTo: (flight: string, city: string, pct: number) =>
      `En vuelo ${flight} hacia ${city} (${pct}%)`,
    layoverAt: (city: string, flight: string, h: number, m: number) =>
      `En ${city} — Próximo vuelo ${flight} en ${h}h ${m}min`,
    inTransit: 'En tránsito',
    planePopup: 'Pilar va por aquí',
    totalTime: 'Tiempo total',
    airTime: 'Tiempo en el aire',
    waitTime: 'Tiempo de espera',
    elapsed: 'Llevas',
    remaining: 'Quedan',
    notStarted: 'No iniciado',
    finished: 'Completado',
    cities: {
      SIN: 'Singapur',
      DEL: 'Nueva Delhi',
      MUC: 'Múnich',
      MAD: 'Madrid',
    } as Record<string, string>,
    countries: {
      SIN: 'Singapur',
      DEL: 'India',
      MUC: 'Alemania',
      MAD: 'España',
    } as Record<string, string>,
  },
  de: {
    title: 'Wo ist Pilar?',
    route: 'Singapur → Neu-Delhi → München → Madrid',
    currentTime: 'Aktuelle Zeit:',
    loading: 'Laden...',
    loadingMap: 'Karte wird geladen...',
    journeyProgress: 'Reisefortschritt',
    flightDetails: 'Flugdetails',
    leg: 'Abschnitt',
    flight: 'Flug',
    routeCol: 'Route',
    departure: 'Abflug',
    arrival: 'Ankunft',
    status: 'Status',
    scheduled: 'Geplant',
    inFlight: 'Im Flug',
    landed: 'Gelandet',
    footer: 'Alle 30 Sekunden aktualisiert · Zeiten sind geschätzt',
    journeyNotStarted: 'Reise hat noch nicht begonnen',
    arrived: 'Pilar ist in Madrid angekommen!',
    flyingTo: (flight: string, city: string, pct: number) =>
      `Im Flug ${flight} nach ${city} (${pct}%)`,
    layoverAt: (city: string, flight: string, h: number, m: number) =>
      `In ${city} — Nächster Flug ${flight} in ${h}h ${m}min`,
    inTransit: 'Im Transit',
    planePopup: 'Pilar ist gerade hier',
    totalTime: 'Gesamtreisezeit',
    airTime: 'Flugzeit',
    waitTime: 'Wartezeit',
    elapsed: 'Vergangen',
    remaining: 'Verbleibend',
    notStarted: 'Nicht gestartet',
    finished: 'Abgeschlossen',
    cities: {
      SIN: 'Singapur',
      DEL: 'Neu-Delhi',
      MUC: 'München',
      MAD: 'Madrid',
    } as Record<string, string>,
    countries: {
      SIN: 'Singapur',
      DEL: 'Indien',
      MUC: 'Deutschland',
      MAD: 'Spanien',
    } as Record<string, string>,
  },
};

export type Translations = typeof translations['es'];

export function getTranslations(lang: Lang): Translations {
  return translations[lang];
}
