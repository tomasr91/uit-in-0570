# Handmatig verzamelde activiteiten

JSON-bestanden in deze map komen via de bron `handmatig` in de app: activiteiten die de nachtelijke update niet zelf kan ophalen. Elk bestand heeft de vorm `{ "meta": { … }, "events": [ … ] }`; elk event heeft minimaal `sourceName`, `sourceEventId`, `url` (de officiële bron), `title`, `start` en `checkedAt`. Zie `collector/adapters/curated.ts` en de bestanden in deze map bij Uit in 030 voor alle velden.

De skill `bronnen-verversen` houdt deze bestanden wekelijks bij.
