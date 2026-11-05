/**
 * Bekende locaties van Deventer (stadsprofiel), met wijk/plaats en adres.
 * Coördinaten zijn weggelaten: de update zoekt het adres op via PDOK.
 * Adressen gecontroleerd op 5-11-2026 (eigen sites, Kidsproof, Go-kids).
 */
import type { KnownVenue } from '../collector/venues.ts';

export const CITY_VENUES: KnownVenue[] = [
  { name: 'Deventer Schouwburg', aliases: /deventer schouwburg|^schouwburg$/i, locality: 'Binnenstad', address: 'Leeuwenbrug 2, 7411 TJ Deventer', indoor: 'binnen' },
  { name: 'Burgerweeshuis', aliases: /burgerweeshuis/i, locality: 'Binnenstad', address: 'Bagijnenstraat 9, 7411 PT Deventer', indoor: 'binnen' },
  { name: 'Bibliotheek Deventer Centrum', aliases: /bibliotheek (deventer )?centrum|bibliotheek deventer/i, locality: 'Binnenstad', address: 'Stromarkt 18, 7411 PK Deventer', indoor: 'binnen' },
  { name: 'Speelgoedmuseum Deventer', aliases: /speelgoedmuseum/i, locality: 'Binnenstad', address: 'Brink 47, 7411 BV Deventer', indoor: 'binnen' },
  { name: 'Museum De Waag', aliases: /museum de waag|^de waag$/i, locality: 'Binnenstad', address: 'Brink 56, 7411 BV Deventer', indoor: 'binnen' },
  { name: 'Bergkerk', aliases: /bergkerk/i, locality: 'Bergkwartier', address: 'Bergkerkplein 1, Deventer', indoor: 'binnen' },
  { name: 'Lebuïnuskerk', aliases: /lebu[iï]nuskerk|grote kerk deventer/i, locality: 'Binnenstad', address: 'Grote Kerkhof, Deventer', indoor: 'binnen' },
  { name: 'Vue Deventer', aliases: /vue( bioscoop)? deventer|^vue$/i, locality: 'Deventer', address: 'Boreelplein 36, 7411 EH Deventer', indoor: 'binnen' },
  { name: 'De Scheg', aliases: /de scheg/i, locality: 'Deventer', address: 'Piet van Donkplein 1, 7422 LW Deventer', indoor: 'binnen' },
  { name: 'Kinderboerderij De Ulebelt', aliases: /ulebelt/i, locality: 'Deventer', address: 'Maatmansweg 3, Deventer', indoor: 'beide' },
];
