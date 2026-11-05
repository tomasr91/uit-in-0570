/**
 * Eigen adapters van deze stad: voor bronnen zonder iCal-feed, JSON-LD of WordPress-agenda
 * (die kun je zonder code toevoegen in city/sources.config.json, zie collector/adapters/generic.ts).
 * De sleutel is de bron-ID in city/sources.config.json. Voorbeelden van adapters staan in de
 * repository van Uit in 030 (tomasr91/wattedoeninutrecht, map city/adapters/).
 */
import type { SourceAdapter } from '../../collector/adapters/types.ts';

export const CITY_ADAPTERS: Record<string, SourceAdapter> = {};
