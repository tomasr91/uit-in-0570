# Databronnen en beperkingen — Uit in 0570

Per bron: wat er wordt opgehaald, hoe, en wat de beperkingen zijn. Alle bronnen worden beleefd benaderd: herkenbare User-Agent met contactadres, `robots.txt` wordt gerespecteerd, minimaal 1,5 seconde tussen verzoeken per website. Omschrijvingen van bronnen worden niet overgenomen; de app toont een eigen, korte samenvatting en verwijst naar de bron.

## Actief

| Bron | Adapter | Methode | Dekking | Beperkingen |
|---|---|---|---|---|
| Handmatig | `handmatig` | JSON in `data/curated/` | Startdataset (Sinterklaasintochten, Dickens Festijn) en wat de nachtelijke update niet zelf kan ophalen | Wekelijks bijgehouden door de skill `bronnen-verversen` |
| MIMIK | `mimik` | Sitemap + pagina per titel (schema.org ScreeningEvent) | Films (één item per film over de speelperiode), theater en Junior per voorstelling, met zaal en prijs | `/mvc/` (de agendalijst) is verboden in robots.txt; pagina's die helemaal voorbij zijn worden niet opnieuw opgehaald. Eerste run ± 185 pagina's |
| Burgerweeshuis | `burgerweeshuis` | `/programma` + pagina per voorstelling (schema.org Event en vakjes) | Concerten, clubavonden, talentavonden; aanvangstijd, eindtijd, prijs, status (uitverkocht/geannuleerd) | ± 55 detailpagina's per run |
| Vaste plekken | `vaste-plekken` | `data/places.json` | Musea, kinderboerderijen, speeltuinen, bibliotheek, zwembad | Maandelijks gecontroleerd; openingstijden alleen waar bevestigd |

## Nog te onderzoeken (staan in `diagnoseUrls`)

Deze bronnen hebben een eigen adapter in `city/adapters/` nodig. De websites zijn vanuit een Claude-sessie niet bereikbaar; de workflow *Bronnen diagnose* haalt ze vanuit GitHub Actions op (zie `CLAUDE.md`, "Een bron onderzoeken"). Daarna kan een adapter geschreven worden, zoals bij Uit in 038 en Uit in 030.

| Bron | Website | Waarom |
|---|---|---|
| Deventer Schouwburg | deventerschouwburg.nl | Grootste podium; eigen programma Jeugd & Familie |
| Speelgoedmuseum Deventer | hetspeelgoedmuseum.nl | Terugkerende gezinsactiviteiten (spelletjesmiddag, knutselmiddag) |
| Dickens Festijn | dickensfestijn.nl | Datum en tijden in december |

Eerste diagnose (5-11-2026, vanuit GitHub Actions): de Deventer Schouwburg geeft 403 (Cloudflare-controle, ook voor robots.txt); MIMIK (`/agenda/`), Burgerweeshuis (`/programma`), Speelgoedmuseum (`/agenda/activiteitenkalender/`, WordPress) en Dickens Festijn (`/programma-dickensfestijn/`) zijn bereikbaar. Geen van de vijf heeft een iCal-feed of een The Events Calendar-API op de homepage; volgende stap is een diagnose met `bewaar` van die agendapagina's.

Overwogen, voorlopig niet: **Pathé** (geen vestiging in Deventer), **Vue Deventer** (motor heeft alleen een Pathé-adapter), **Bibliotheek Deventer** (website nog niet vastgesteld).
