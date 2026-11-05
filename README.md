# Uit in 0570 — gezinsagenda voor Deventer

Wat er de komende maanden te doen is in Deventer, voor de kinderen (gefilterd op hun leeftijd op de dag zelf) en voor volwassenen. Installeerbaar als app op je telefoon, zonder account.

- **App:** https://tomasr91.github.io/uit-in-0570/ (op je telefoon: *Zet op beginscherm*)
- **Motor:** [uit-core](https://github.com/tomasr91/uit-core), dezelfde als [Uit in 030](https://github.com/tomasr91/wattedoeninutrecht) en [Uit in 038](https://github.com/tomasr91/uit-in-038). Alles van Deventer staat in `city/`; de rest (zie `core.json`) wordt bijgewerkt via de workflow *Motor bijwerken*.
- **Bronnen:** zie [city/BRONNEN.md](city/BRONNEN.md).
- **Onderhoud door Claude:** zie [docs/GEPLANDE-TAKEN.md](docs/GEPLANDE-TAKEN.md).

Lokaal: `npm install`, `npm run dev` (app), `npm run collect` (bronnen ophalen), `npm test`.

## Eenmalig instellen op GitHub

1. *Settings → Actions → General*: *Workflow permissions* op **Read and write**, en **Allow GitHub Actions to create and approve pull requests** aan.
2. *Settings → Pages*: *Source* op **GitHub Actions**.
3. *Settings → Secrets and variables → Actions → Variables*: `COLLECTOR_CONTACT` = je e-mailadres (komt in de User-Agent).
4. *Actions → Dagelijkse update → Run workflow*.

## Privacy

De app slaat niets op een server op. Het gezinsprofiel (namen, geboortedata, thuisadres) en bewaarde activiteiten staan alleen in de browser op je telefoon.
