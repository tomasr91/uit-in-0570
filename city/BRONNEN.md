# Databronnen en beperkingen — Uit in 0570

Per bron: wat er wordt opgehaald, hoe, en wat de beperkingen zijn. Alle bronnen worden beleefd benaderd: herkenbare User-Agent met contactadres, `robots.txt` wordt gerespecteerd, minimaal 1,5 seconde tussen verzoeken per website. Omschrijvingen van bronnen worden niet overgenomen; de app toont een eigen, korte samenvatting en verwijst naar de bron.

## Actief

| Bron | Adapter | Methode | Dekking | Beperkingen |
|---|---|---|---|---|
| Handmatig | `handmatig` | JSON in `data/curated/` | Startdataset (Sinterklaasintochten, Dickens Festijn) en wat de nachtelijke update niet zelf kan ophalen | Wekelijks bijgehouden door de skill `bronnen-verversen` |
| Vaste plekken | `vaste-plekken` | `data/places.json` | Musea, kinderboerderijen, speeltuinen, bibliotheek, zwembad | Maandelijks gecontroleerd; openingstijden alleen waar bevestigd |

## Nog te onderzoeken (staan in `diagnoseUrls`)

Deze bronnen hebben een eigen adapter in `city/adapters/` nodig. De websites zijn vanuit een Claude-sessie niet bereikbaar; de workflow *Bronnen diagnose* haalt ze vanuit GitHub Actions op (zie `CLAUDE.md`, "Een bron onderzoeken"). Daarna kan een adapter geschreven worden, zoals bij Uit in 038 en Uit in 030.

| Bron | Website | Waarom |
|---|---|---|
| Deventer Schouwburg | deventerschouwburg.nl | Grootste podium; eigen programma Jeugd & Familie |
| MIMIK | mimik.nl | Filmtheater en vlakke vloer, werkt samen met de Schouwburg; kinderfilms |
| Burgerweeshuis | burgerweeshuis.nl | Poppodium (concerten en clubavonden) |
| Speelgoedmuseum Deventer | hetspeelgoedmuseum.nl | Terugkerende gezinsactiviteiten (spelletjesmiddag, knutselmiddag) |
| Dickens Festijn | dickensfestijn.nl | Datum en tijden in december |

Overwogen, voorlopig niet: **Pathé** (geen vestiging in Deventer), **Vue Deventer** (motor heeft alleen een Pathé-adapter), **Bibliotheek Deventer** (website nog niet vastgesteld).
