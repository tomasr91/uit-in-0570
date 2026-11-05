/**
 * Eigen adapters van Deventer (stadsprofiel). De sleutel is de bron-ID in city/sources.config.json.
 * Algemene adapters (handmatig, vaste-plekken, pathe en de types ical/jsonld/tribe) levert de motor.
 */
import type { SourceAdapter } from '../../collector/adapters/types.ts';
import { burgerweeshuis } from './burgerweeshuis.ts';
import { deventerInfo } from './deventer-info.ts';
import { mimik } from './mimik.ts';

export const CITY_ADAPTERS: Record<string, SourceAdapter> = {
  burgerweeshuis,
  'deventer-info': deventerInfo,
  mimik,
};
