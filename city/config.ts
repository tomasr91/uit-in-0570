/**
 * Stadsprofiel van Uit in 0570 (Deventer).
 *
 * Alles wat de app tot de agenda van Deventer maakt, staat in de map city/:
 *  - config.ts            dit bestand: naam, kleuren, thuiswijk, zones en teksten
 *  - venues.ts            bekende locaties
 *  - Landmark.tsx         de Lebuïnustoren in de kop van de app
 *  - sources.config.json  welke bronnen de nachtelijke update ophaalt
 *  - adapters/            eigen code voor bronnen zonder feed
 *  - BRONNEN.md           uitleg per bron
 *
 * Dit bestand bevat alleen gegevens (geen React, geen Node), zodat app,
 * verzamellaag, tests en vite.config.ts het kunnen importeren.
 * Zie src/domain/city-types.ts voor de betekenis van elk veld.
 */
import type { CityConfig } from '../src/domain/city-types';

export const CITY: CityConfig = {
  id: 'deventer',

  app: {
    name: 'Uit in 0570',
    tagline: 'Ontdek. Kies. Ga.',
    description: 'Persoonlijke gezinsagenda voor Deventer en omgeving.',
    manifestDescription: 'Wat te doen in Deventer en omgeving, voor kinderen en volwassenen.',
    url: 'https://tomasr91.github.io/uit-in-0570/',
    repository: 'tomasr91/uit-in-0570',
  },

  /** Baksteenrood (Bergkwartier, Deventer koek), zodat Uit in 0570 zich onderscheidt van 030 (blauw) en 038 (groen). */
  theme: {
    brand: '#8a3b2b',
    brandInk: '#7a3225',
    brandSoft: '#f4e6e2',
    headBg: '#47231b',
    headMuted: '#e2c9c2',
    headLandmark: '#f0dcd5',
    dayInk: '#47231b',
  },

  cityName: 'Deventer',
  /** De Brink. */
  center: { lat: 52.2518, lon: 6.1561 },
  cityRadiusKm: 6,

  /**
   * Geen aparte thuiswijk gekozen: de binnenstad (met Bergkwartier en Noordenbergkwartier)
   * is de thuiswijk en de Brink het standaard vertrekpunt. Thuisadres instellen kan in de app.
   */
  home: {
    zoneId: 'binnenstad',
    name: 'de binnenstad',
    label: 'De Brink',
    lat: 52.2518,
    lon: 6.1561,
    localities: ['binnenstad', 'bergkwartier', 'noordenbergkwartier', 'noordenberg'],
    radiusKm: 1.2,
  },

  city: {
    zoneId: 'deventer',
    localities: [
      'deventer', 'centrum', 'zandweerd', 'voorstad', 'knutteldorp', 'rivierenwijk', 'keizerslanden',
      'borgele', 'platvoet', 'colmschate', 'vijfhoek', 'de vijfhoek', 'steenbrugge', 'holterhoek',
      'havenkwartier', 'hoornwerk', 'worp', 'de worp', 'schalkhaar', 'diepenveen', 'bathmen', 'lettele',
      'okkenbroek', 'averlo', 'frieswijk', 'tjoene', 'oxe',
    ],
  },

  zoneLabels: { binnenstad: 'Deventer', deventer: 'Deventer', omgeving: 'Omgeving' },

  bikeMaxKm: 8,
  addressPlaceholder: 'Straat 1, Deventer of 7411 AB',
  curatedNote: 'Ze worden elke week opnieuw gecontroleerd.',
  dedupeGenericWords: ['deventer', 'schouwburg', 'mimik', 'burgerweeshuis', 'bergkerk'],
  bot: { name: 'UitIn0570Bot', project: 'uit-in-0570' },
};
