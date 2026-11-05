/**
 * MIMIK — film, theater en Junior (jeugd) in Deventer (Achter de Muren Vispoort).
 *
 * Werkwijze (vastgesteld 5-11-2026 met de workflow Bronnen diagnose, vanaf een GitHub-server):
 *  - De agendapagina laadt haar lijst met JavaScript uit /mvc/events/partial; robots.txt verbiedt /mvc/.
 *    Daarom gebruiken we de sitemap (/sitemap.xml) met alle pagina's /agenda/<slug>.
 *  - Elke pagina /agenda/<slug> heeft per voorstelling een schema.org ScreeningEvent (of ander Event) met
 *    startDate in lokale tijd, plus een lijst met speeltijden (datum, tijd, zaal, prijs, knop),
 *    het soort (h2.genre: Film, Theater, …) en de Kijkwijzer-plaatjes.
 *  - De sitemap bevat ook voorbij programma. Pagina's waarvan alle voorstellingen voorbij zijn, halen we
 *    niet opnieuw op (detailcache); pagina's zonder speeltijden hooguit eens per week.
 *  - Films: één item per film met de periode waarin hij draait (zoals bij Pathé); theater en Junior:
 *    één item per voorstelling.
 *  - Omschrijvingen worden niet overgenomen.
 */
import * as cheerio from 'cheerio';
import { fetchText } from '../../collector/lib/http.ts';
import { cleanText, extractJsonLdEvents, isoToLocal } from '../../collector/lib/parse.ts';
import { estimatedMinFromRating } from '../../collector/adapters/pathe.ts';
import type { RawEvent } from '../../collector/normalize.ts';
import type { AdapterContext, AdapterResult, SourceAdapter } from '../../collector/adapters/types.ts';

const BASE = 'https://www.mimik.nl';
const ID = 'mimik';
const NAME = 'MIMIK';
const ADDRESS = 'Achter de Muren Vispoort 8-10, 7411 SL Deventer';

export interface MimikShow {
  start: string;
  room?: string;
  price?: string;
  soldOut?: boolean;
}
export interface MimikPage {
  url: string;
  title: string;
  genre?: string;
  kijkwijzer?: string;
  durationMinutes?: number;
  shows: MimikShow[];
}

/** /agenda/<slug>-pagina's uit de sitemap. */
export function parseMimikSitemap(xml: string): string[] {
  const urls = [...xml.matchAll(/<loc>\s*(https:\/\/www\.mimik\.nl\/agenda\/[^<?#\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/\/$/, ''));
  return [...new Set(urls)];
}

/** "vanaf-6-jaar" → "-6ans" (zelfde sleutels als bij Pathé), "al" → "al". */
function ratingRef(img: string | undefined): string | undefined {
  if (!img) return undefined;
  if (/^al(le)?(-leeftijden)?$/.test(img)) return 'al';
  const m = img.match(/vanaf-(\d+)/);
  return m ? `-${m[1]}ans` : undefined;
}

export function parseMimikPage(html: string, url: string): MimikPage | undefined {
  const $ = cheerio.load(html);
  const ld = extractJsonLdEvents(html).filter((o) => typeof o.startDate === 'string' && typeof o.name === 'string');
  const title = cleanText(String(ld[0]?.name ?? $('h1.title').first().text()));
  if (!title) return undefined;
  // Speeltijden in de lijst: "za 07-11" + "18:30" → zaal, prijs, knop.
  const rows = new Map<string, Omit<MimikShow, 'start'>>();
  $('.date').each((_, el) => {
    const li = $(el).closest('li');
    const d = cleanText($(el).text()).match(/(\d{2})-(\d{2})/);
    const t = cleanText(li.find('.time').text()).match(/(\d{1,2}):(\d{2})/);
    if (!d || !t) return;
    const button = cleanText(li.find('.button').text());
    rows.set(`${d[2]}-${d[1]}T${t[1].padStart(2, '0')}:${t[2]}`, {
      room: cleanText(li.find('.room').text()) || undefined,
      price: cleanText(li.find('.sales').text()).replace(/\s+/g, ' ') || undefined,
      soldOut: /uitverkocht/i.test(button),
    });
  });
  const shows: MimikShow[] = [];
  const seen = new Set<string>();
  for (const o of ld) {
    const start = isoToLocal(String(o.startDate));
    if (seen.has(start)) continue;
    seen.add(start);
    shows.push({ start, ...(rows.get(start.slice(5, 16)) ?? {}) });
  }
  shows.sort((a, b) => a.start.localeCompare(b.start));
  const duur = cleanText($('.item-details').filter((_, el) => /^duur/i.test(cleanText($(el).find('.title').text()))).find('.subtitle').text()).match(/(\d+)/);
  const kw = $('ul.kijkwijzer img')
    .map((_, img) => ($(img).attr('src') ?? '').match(/kijkwijzer\/([a-z0-9-]+)\.png/)?.[1])
    .get()
    .map(ratingRef)
    .find(Boolean);
  return {
    url,
    title,
    genre: cleanText($('h2.genre').first().text()) || undefined,
    kijkwijzer: kw,
    durationMinutes: duur ? Number(duur[1]) : undefined,
    shows,
  };
}

const JUNIOR = /\b(junior|kinder\w*|kids?|famil\w*|jeugd\w*|peuter\w*|kleuter\w*)\b/i;
const venue = (room?: string) => ({ venueName: room ? `MIMIK, ${room}` : 'MIMIK', address: ADDRESS, locality: 'Binnenstad' });

export function mimikToRaw(p: MimikPage, today: string, until: string, nowIso: string): RawEvent[] {
  const shows = p.shows.filter((s) => s.start.slice(0, 10) >= today && s.start.slice(0, 10) <= until);
  if (!shows.length) return [];
  const isFilm = /film/i.test(p.genre ?? '') || (!p.genre && p.kijkwijzer !== undefined);
  const junior = JUNIOR.test(`${p.genre ?? ''} ${p.title}`);
  const slug = p.url.split('/').pop()!;
  const ageFields: Partial<RawEvent> =
    junior && p.kijkwijzer
      ? {
          ageLabel: p.kijkwijzer === 'al' ? 'Alle leeftijden' : `Kijkwijzer ${p.kijkwijzer.replace(/\D/g, '')} (jonger met begeleiding)`,
          estimatedMinMonths: estimatedMinFromRating(p.kijkwijzer),
          estimateReason: 'Kijkwijzer',
        }
      : {};
  const base = {
    sourceId: ID,
    sourceName: NAME,
    url: p.url,
    title: p.title,
    bookingText: 'tickets',
    durationMinutes: p.durationMinutes,
    hints: [p.genre ?? '', junior ? 'Junior' : ''].filter(Boolean),
    audiences: (junior ? ['kinderen', 'gezin'] : ['volwassenen']) as RawEvent['audiences'],
    indoor: 'binnen' as const,
    ...ageFields,
    checkedAt: nowIso,
  };
  if (isFilm) {
    const first = shows[0];
    const last = shows[shows.length - 1];
    const firstDay = first.start.slice(0, 10);
    const lastDay = last.start.slice(0, 10);
    const one = shows.length === 1;
    return [
      {
        ...base,
        ...venue(one ? first.room : undefined),
        sourceEventId: `mimik-${slug}`,
        start: one ? first.start : firstDay,
        end: lastDay > firstDay ? lastDay : undefined,
        allDay: !one,
        ongoing: lastDay > firstDay,
        priceText: first.price,
        categories: ['film'],
        kind: junior ? 'Kinderfilm' : 'Film',
        openingNote: one ? undefined : `${shows.length} voorstellingen in deze periode. Tijden op mimik.nl.`,
        statusText: shows.every((s) => s.soldOut) ? 'uitverkocht' : undefined,
      },
    ];
  }
  return shows.map((s) => ({
    ...base,
    ...venue(s.room),
    sourceEventId: `mimik-${slug}-${s.start}`,
    start: s.start,
    priceText: s.price,
    kind: junior ? 'Jeugdtheater' : p.genre || 'Theater',
    statusText: s.soldOut ? 'uitverkocht' : undefined,
  }));
}

interface Cached {
  last?: string;
}

export const mimik: SourceAdapter = {
  id: ID,
  name: NAME,
  homepage: `${BASE}/agenda`,
  method: 'jsonld',
  description: 'Films, theater en Junior-voorstellingen van MIMIK, uit de pagina per titel (via de sitemap).',
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const urls = parseMimikSitemap(await fetchText(`${BASE}/sitemap.xml`));
    if (!urls.length) throw new Error('MIMIK: geen agendapagina\'s in de sitemap');
    const events: RawEvent[] = [];
    const weekAgo = new Date(Date.parse(ctx.nowIso) - 7 * 86400000).toISOString();
    let fetched = 0;
    let skipped = 0;
    for (const url of urls) {
      const hit = ctx.cache?.get<Cached>(url);
      // Alles voorbij: niet opnieuw ophalen. Zonder speeltijden: eens per week.
      if (hit && hit.value.last && hit.value.last.slice(0, 10) < ctx.today) {
        skipped++;
        continue;
      }
      if (hit && !hit.value.last && hit.fetchedAt > weekAgo) {
        skipped++;
        continue;
      }
      if (fetched >= ctx.maxDetailPages) break;
      fetched++;
      try {
        const page = parseMimikPage(await fetchText(url), url);
        ctx.cache?.set(url, { last: page?.shows.at(-1)?.start } satisfies Cached);
        if (page) events.push(...mimikToRaw(page, ctx.today, ctx.until, ctx.nowIso));
      } catch (e) {
        ctx.log(`  fout bij ${url}: ${(e as Error).message}`);
      }
    }
    return { events, notes: `${fetched} pagina's opgehaald, ${skipped} uit de cache overgeslagen` };
  },
};
