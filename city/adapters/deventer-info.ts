/**
 * deventer.info — de stadsagenda van VVV Deventer / Deventer Marketing ("…inDeventer"), alle soorten
 * activiteiten, ook de voorstellingen van de Deventer Schouwburg (die zelf geen bots toelaat).
 *
 * Werkwijze (vastgesteld 5-11-2026 met de workflow Bronnen diagnose, vanaf een GitHub-server):
 *  - Hetzelfde touristserver-platform als VisitZwolle, met andere opmaak. Per dag een lijst:
 *    /agenda/DD-MM-JJJJ/ met 24 kaarten per pagina; volgende pagina's via ?p=1, ?p=2 … (link rel="next").
 *  - Per kaart (article.calendarbox): link /agenda-item/<id>/<slug>/, titel (em), begintijd (time datetime),
 *    tijden ("11:00 - 17:00"), adres ("Plek, Straat 1") en prijs ("gratis", "€ 5,00 - € 9,00").
 *    De korte tekst op de kaart (span.dsc) is een omschrijving van de bron en wordt niet overgenomen.
 *  - Kinderactiviteiten: dezelfde lijst onder /agenda/kinderen/DD-MM-JJJJ/; die krijgen de hint "Kinderen".
 *  - Soort: per categorie dezelfde lijst (/agenda/theater/DD-MM-JJJJ/ enz.); die halen we voor de eerste
 *    dagen (catDays) op. Het label geldt voor het hele agenda-item, want elk item heeft één vast nummer.
 *  - Detailpagina (/agenda-item/<id>/…): de tekst in .markdown dient alleen voor de indeling (leeftijd,
 *    soort) en wordt niet getoond; één keer per item opgehaald (detailcache, 28 dagen geldig).
 *  - robots.txt staat /agenda/ en dagpagina's vanaf 2026 toe (alleen oudere jaren en /suchen/ zijn verboden).
 *  - Dezelfde activiteit staat elke dag opnieuw in de lijst; de app voegt vaste reeksen samen.
 */
import * as cheerio from 'cheerio';
import { fetchText } from '../../collector/lib/http.ts';
import { cleanText, detailInfo, isoToLocal, parseTimes } from '../../collector/lib/parse.ts';
import { addDays } from '../../src/domain/dates.ts';
import type { RawEvent } from '../../collector/normalize.ts';
import type { AdapterContext, AdapterResult, SourceAdapter } from '../../collector/adapters/types.ts';

const BASE = 'https://www.deventer.info';
const ID = 'deventer-info';
const NAME = 'Deventer.info (VVV Deventer)';
const MAX_PAGES_PER_DAY = 10;

export interface DiCard {
  id: string;
  path: string;
  title: string;
  datetime?: string;
  times?: string;
  place?: string;
  price?: string;
}

/** Categorielijsten (pad → label), in volgorde van voorkeur voor het soortlabel. */
export const DI_CATEGORIES: [string, string][] = [
  ['theater', 'Theater'],
  ['muziek', 'Muziek'],
  ['film', 'Film'],
  ['festival', 'Festival'],
  ['expositie', 'Expositie'],
  ['markt', 'Markt'],
  ['workshop', 'Workshop'],
  ['rondleiding', 'Rondleiding'],
  ['educatie', 'Educatie'],
  ['actief', 'Actief'],
  ['eten-drinken', 'Eten & drinken'],
  ['winkelen', 'Winkelen'],
  ['kunst-cultuur', 'Kunst & cultuur'],
];

export function dayPath(day: string): string {
  const [y, m, d] = day.split('-');
  return `${d}-${m}-${y}`;
}

/** Tekst van een kaartregel zonder het label ("aanvang", "adres", "prijs"). */
const liText = ($: cheerio.CheerioAPI, li: cheerio.Cheerio<any>) => {
  const c = li.clone();
  c.find('span, svg, strong').remove();
  return cleanText(c.text()) || undefined;
};

export function parseDiList(html: string): { cards: DiCard[]; hasNext: boolean } {
  const $ = cheerio.load(html);
  const cards: DiCard[] = [];
  $('article.calendarbox').each((_, el) => {
    const a = $(el).find('a.box').first();
    const href = a.attr('href') ?? '';
    const m = href.match(/\/agenda-item\/(\d+)\/[^/?#]*\/?/);
    if (!m) return;
    // Cheerio sluit de <li>'s zonder eindtag zelf af; per klasse uitlezen.
    cards.push({
      id: m[1],
      path: m[0].endsWith('/') ? m[0] : `${m[0]}/`,
      title: cleanText(a.find('.text em').first().text()),
      datetime: a.find('time[datetime]').attr('datetime'),
      times: liText($, a.find('li.starttime').first()),
      place: liText($, a.find('li.place').first()),
      price: liText($, a.find('li.price').first()),
    });
  });
  return { cards, hasNext: $('.pagination a[rel="next"]').length > 0 };
}

/** "Deventer Schouwburg, Leeuwenbrug 2" → plek en adres; links en losse straatnamen zonder komma netjes. */
export function splitPlace(place: string | undefined): Pick<RawEvent, 'venueName' | 'address'> {
  if (!place) return {};
  const p = cleanText(place.replace(/https?:\/\/\S+/g, ''));
  if (!p) return {};
  const i = p.lastIndexOf(',');
  if (i < 0) return { venueName: p };
  const venueName = cleanText(p.slice(0, i));
  const street = cleanText(p.slice(i + 1));
  const looksLikeStreet = /[a-z]{3,}.*\d/i.test(street) && !/\d{4}\s?[a-z]{2}/i.test(street);
  return { venueName: venueName || undefined, address: looksLikeStreet ? `${street}, Deventer` : street || undefined };
}

function priceOf(price: string | undefined): string | undefined {
  if (!price) return undefined;
  if (/^gratis$/i.test(price)) return 'Gratis';
  return /\d/.test(price) ? price : undefined;
}

/** Een kaart van de dagpagina; undefined als de kaart een andere dag noemt. */
export function diToRaw(c: DiCard, day: string, kids: boolean, nowIso: string): RawEvent | undefined {
  if (!c.title) return undefined;
  const local = c.datetime ? isoToLocal(c.datetime) : day;
  if (local.slice(0, 10) !== day) return undefined;
  const t = parseTimes(c.times ?? '');
  const start = t.start ? `${day}T${t.start}` : local.length > 10 ? `${day}T${local.slice(11, 16)}` : day;
  const end = t.end && t.start && t.end > t.start ? `${day}T${t.end}` : undefined;
  return {
    sourceId: ID,
    sourceName: NAME,
    sourceEventId: `di-${c.id}-${day}`,
    seriesKey: `di-${c.id}`,
    url: `${BASE}${c.path}`,
    title: c.title,
    start,
    end,
    allDay: !t.start && local.length <= 10,
    ...splitPlace(c.place),
    priceText: priceOf(c.price),
    hints: kids ? ['Kinderen'] : [],
    checkedAt: nowIso,
  };
}

/** Labels van een item: de eerste wordt het soortlabel, alle labels gaan als hint mee. */
export function withCategories(raw: RawEvent, labels: string[] | undefined): RawEvent {
  if (!labels?.length) return raw;
  const order = DI_CATEGORIES.map(([, l]) => l);
  const sorted = [...new Set(labels)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { ...raw, kind: sorted[0], hints: [...(raw.hints ?? []), ...sorted] };
}

/** Wat we van een detailpagina bewaren: alleen voor de indeling, niet om te tonen. */
export interface DiDetail {
  text?: string;
  officialMinMonths?: number;
  officialMaxMonths?: number;
  ageLabel?: string;
}

export function parseDiDetail(html: string): DiDetail {
  const d = detailInfo(html, '.markdown');
  return {
    text: d.text ? d.text.slice(0, 1500) : undefined,
    officialMinMonths: d.age?.officialMinMonths,
    officialMaxMonths: d.age?.officialMaxMonths,
    ageLabel: d.age?.label,
  };
}

export function withDetail(raw: RawEvent, d: DiDetail | undefined): RawEvent {
  if (!d) return raw;
  return {
    ...raw,
    descriptionForClassification: d.text,
    officialMinMonths: d.officialMinMonths,
    officialMaxMonths: d.officialMaxMonths,
    ageLabel: d.ageLabel,
  };
}

const DETAIL_VERSION = 'did1';
const DETAIL_MAX_AGE_DAYS = 28;

/** Alle kaarten van één dag (alle pagina's). */
async function fetchDay(path: string): Promise<DiCard[]> {
  const out: DiCard[] = [];
  const ids = new Set<string>();
  for (let p = 0; p < MAX_PAGES_PER_DAY; p++) {
    const { cards, hasNext } = parseDiList(await fetchText(`${BASE}${path}${p ? `?p=${p}` : ''}`));
    const fresh = cards.filter((c) => !ids.has(c.id));
    // Geeft een volgende pagina dezelfde kaarten terug, dan werkt het bladeren niet: stoppen.
    if (!fresh.length) break;
    for (const c of fresh) ids.add(c.id);
    out.push(...fresh);
    if (!hasNext) break;
  }
  return out;
}

export const deventerInfo: SourceAdapter = {
  id: ID,
  name: NAME,
  homepage: `${BASE}/agenda/`,
  method: 'html',
  description: 'De stadsagenda van VVV Deventer (deventer.info): alle activiteiten per dag, kinderactiviteiten gemarkeerd.',
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const maxDays = (ctx.options.maxDays as number | undefined) ?? 120;
    const catDays = (ctx.options.catDays as number | undefined) ?? 14;
    const events: RawEvent[] = [];
    const cats = new Map<string, string[]>();
    let catFailed = 0;
    for (let day = ctx.today, i = 0; i < catDays && day <= ctx.until; day = addDays(day, 1), i++) {
      for (const [path, label] of DI_CATEGORIES) {
        try {
          for (const c of await fetchDay(`/agenda/${path}/${dayPath(day)}/`)) {
            const l = cats.get(c.id) ?? [];
            if (!l.includes(label)) l.push(label);
            cats.set(c.id, l);
          }
        } catch {
          catFailed++;
        }
      }
    }
    const seen = new Set<string>();
    let days = 0;
    let kidsFailed = 0;
    for (let day = ctx.today; day <= ctx.until && days < maxDays; day = addDays(day, 1), days++) {
      const cards = await fetchDay(`/agenda/${dayPath(day)}/`);
      let kidIds = new Set<string>();
      try {
        kidIds = new Set((await fetchDay(`/agenda/kinderen/${dayPath(day)}/`)).map((c) => c.id));
      } catch {
        kidsFailed++;
      }
      for (const c of cards) {
        const raw = diToRaw(c, day, kidIds.has(c.id), ctx.nowIso);
        if (!raw || seen.has(raw.sourceEventId!)) continue;
        seen.add(raw.sourceEventId!);
        events.push(withCategories(raw, cats.get(c.id)));
      }
    }
    // Detailpagina's: één per agenda-item, uit de cache waar het kan; nieuwe items dichtstbij eerst.
    const details = new Map<string, DiDetail>();
    let fetched = 0;
    let detailFailed = 0;
    const fresh = (at: string) => (Date.parse(ctx.nowIso) - Date.parse(at)) / 86_400_000 < DETAIL_MAX_AGE_DAYS;
    for (const e of [...events].sort((a, b) => (a.start < b.start ? -1 : 1))) {
      const id = e.seriesKey!.slice(3);
      if (details.has(id)) continue;
      const key = `${DETAIL_VERSION}|${id}`;
      const hit = ctx.cache?.get<DiDetail>(key);
      if (hit && fresh(hit.fetchedAt)) {
        details.set(id, hit.value);
        continue;
      }
      if (fetched >= ctx.maxDetailPages) {
        if (hit) details.set(id, hit.value);
        continue;
      }
      fetched++;
      try {
        const d = parseDiDetail(await fetchText(e.url));
        ctx.cache?.set(key, d);
        details.set(id, d);
      } catch {
        detailFailed++;
        if (hit) details.set(id, hit.value);
      }
    }
    for (let i = 0; i < events.length; i++) events[i] = withDetail(events[i], details.get(events[i].seriesKey!.slice(3)));

    return {
      events,
      coverage: { from: ctx.today, to: addDays(ctx.today, days - 1) },
      notes: `${events.length} activiteit-dagen over ${days} dagen; ${events.filter((e) => e.kind).length} met soort (${fetched} detailpagina's opgehaald${detailFailed ? `, ${detailFailed} mislukt` : ''})${kidsFailed ? `; kinderlijst ${kidsFailed}× niet gelukt` : ''}${catFailed ? `; categorielijst ${catFailed}× niet gelukt` : ''}`,
    };
  },
};
