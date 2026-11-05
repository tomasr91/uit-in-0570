/**
 * Burgerweeshuis — poppodium van Deventer: concerten (Live), clubavonden (Club) en talentavonden.
 *
 * Werkwijze (vastgesteld 5-11-2026 met de workflow Bronnen diagnose, vanaf een GitHub-server):
 *  - /programma (Webflow) bevat het hele programma als kaarten: datum zonder jaar ("za 10 apr"),
 *    titel, ondertitel, zaal (Concertzaal, Burgercafé, Burgertuin, …), soort (Live/Club/Talent),
 *    status (Uitverkocht, Geannuleerd, Net bevestigd), genres en de ticketlink (Stager).
 *  - Per voorstelling een detailpagina /events/<slug> met schema.org Event (startDate in UTC = deuren
 *    open) en de vakjes geopend/aanvang/eindtijd/leeftijd/prijs. Wij gebruiken de datum uit JSON-LD en
 *    de aanvangstijd uit de vakjes. Webflow verbergt lege vakken met de klasse w-condition-invisible.
 *  - robots.txt staat alles toe. ± 55 detailpagina's per run.
 *  - Omschrijvingen worden niet overgenomen; ondertitel en genres dienen alleen voor de indeling.
 */
import * as cheerio from 'cheerio';
import { fetchText } from '../../collector/lib/http.ts';
import { cleanText, extractJsonLdEvents, isoToLocal, parseDutchDate } from '../../collector/lib/parse.ts';
import type { RawEvent } from '../../collector/normalize.ts';
import type { AdapterContext, AdapterResult, SourceAdapter } from '../../collector/adapters/types.ts';

const BASE = 'https://www.burgerweeshuis.nl';
const ID = 'burgerweeshuis';
const NAME = 'Burgerweeshuis';
const ADDRESS = 'Bagijnenstraat 9, 7411 PT Deventer';

export interface BwhCard {
  slug: string;
  url: string;
  dateText: string;
  title: string;
  subtitle?: string;
  kind?: string;
  room?: string;
  status?: string;
  genres: string[];
  ticketUrl?: string;
}

export interface BwhDetail {
  date?: string;
  doors?: string;
  start?: string;
  end?: string;
  age?: string;
  price?: string;
  soldOut: boolean;
  free: boolean;
}

const visible = ($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>) => !el.closest('.w-condition-invisible').length;

/** Kaarten van /programma. */
export function parseBwhList(html: string): BwhCard[] {
  const $ = cheerio.load(html);
  const out: BwhCard[] = [];
  const seen = new Set<string>();
  $('.events_item').each((_, item) => {
    const $i = $(item);
    const href = $i.find('a.events_content').attr('href') ?? '';
    const m = href.match(/\/events\/([^/?#]+)/);
    if (!m || seen.has(m[1])) return;
    seen.add(m[1]);
    const field = (name: string) => {
      const el = $i.find(`[fs-list-field="${name}"]`).first();
      return el.length && visible($, el) ? cleanText(el.text()) || undefined : undefined;
    };
    const title = field('title');
    const dateText = field('date-text');
    if (!title || !dateText) return;
    out.push({
      slug: m[1],
      url: `${BASE}/events/${m[1]}`,
      dateText,
      title,
      subtitle: field('subtitle'),
      kind: field('tags'),
      room: field('location'),
      status: field('status'),
      genres: $i
        .find('[fs-list-field="genre"]')
        .map((_, g) => cleanText($(g).text()))
        .get()
        .filter(Boolean),
      ticketUrl: $i.find('a.events_tickets').attr('href') || undefined,
    });
  });
  return out;
}

/** "za 10 apr" → datum, met het jaar afgeleid van vandaag. */
export function bwhListDate(text: string, today: string): string | undefined {
  return parseDutchDate(text, today);
}

const hhmm = (s: string | undefined) => s?.match(/\b(\d{1,2}):(\d{2})\b/)?.slice(1, 3).map((x, i) => (i === 0 ? x.padStart(2, '0') : x)).join(':');

/** Detailpagina: datum uit JSON-LD, tijden/leeftijd/prijs uit de zichtbare vakjes. */
export function parseBwhDetail(html: string): BwhDetail {
  const $ = cheerio.load(html);
  const ld = extractJsonLdEvents(html).find((o) => typeof o.startDate === 'string');
  const date = ld ? isoToLocal(String(ld.startDate)).slice(0, 10) : undefined;
  const fields: Record<string, string> = {};
  $('.detail_item').each((_, item) => {
    const boxes = $(item).children('.detail_box');
    if (boxes.length < 2) return;
    const labels = $(boxes[0])
      .children()
      .filter((_, el) => visible($, $(el)))
      .map((_, el) => cleanText($(el).text()).replace(/:$/, '').toLowerCase())
      .get();
    const values = $(boxes[1])
      .children()
      .filter((_, el) => visible($, $(el)))
      .map((_, el) => cleanText($(el).text()))
      .get();
    labels.forEach((l, i) => {
      if (values[i] !== undefined) fields[l] = values[i];
    });
  });
  const btn = (cls: string) => {
    const el = $(`.detail_btn-wrapper a.${cls}`).first();
    return el.length > 0 && !el.hasClass('w-condition-invisible');
  };
  const age = fields['leeftijd'];
  return {
    date,
    doors: hhmm(fields['geopend']),
    start: hhmm(fields['aanvang']),
    end: hhmm(fields['eindtijd']),
    age: age && !/^alle/i.test(age) ? age : undefined,
    price: fields['prijs'] && /\d/.test(fields['prijs']) ? fields['prijs'].replace(/,-$/, ',00') : undefined,
    soldOut: btn('is-soldout'),
    free: btn('is-free'),
  };
}

function venueOf(room: string | undefined): Pick<RawEvent, 'venueName' | 'address' | 'locality'> {
  if (room && /penninckshuis/i.test(room)) return { venueName: 'Het Penninckshuis', address: 'Brink 89, 7411 BX Deventer', locality: 'Binnenstad' };
  if (!room || /^(concertzaal|burgercaf[eé]|burgertuin)$/i.test(room))
    return { venueName: room ? `Burgerweeshuis, ${room}` : 'Burgerweeshuis', address: ADDRESS, locality: 'Binnenstad' };
  return { venueName: room, locality: 'Deventer' };
}

const KIDS = /\b(kinder\w*|kids?|famil\w*|gezin\w*|jeugd\w*|peuter\w*|kleuter\w*)\b/i;

export function bwhToRaw(card: BwhCard, detail: BwhDetail | undefined, today: string, nowIso: string): RawEvent | undefined {
  const day = detail?.date ?? bwhListDate(card.dateText, today);
  if (!day) return undefined;
  const time = detail?.start ?? detail?.doors;
  const start = time ? `${day}T${time}` : day;
  let end: string | undefined;
  if (time && detail?.end) {
    // Eindtijd na middernacht valt op de volgende dag.
    const endDay = detail.end < time ? new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) : day;
    end = `${endDay}T${detail.end}`;
  }
  const status = card.status?.toLowerCase();
  const family = KIDS.test([card.title, card.subtitle, ...card.genres].join(' '));
  return {
    sourceId: ID,
    sourceName: NAME,
    sourceEventId: `bwh-${card.slug}`,
    url: card.url,
    title: card.title.replace(/\s*\/\/\s*/g, ' // ').trim(),
    start,
    end,
    allDay: !time,
    ...venueOf(card.room),
    priceText: detail?.free ? 'Gratis' : detail?.price,
    bookingText: detail?.free ? 'geen ticket nodig' : 'tickets',
    bookingUrl: card.ticketUrl,
    hints: [card.kind ?? '', detail?.age ?? '', ...card.genres].filter(Boolean),
    audiences: family ? undefined : ['volwassenen'],
    descriptionForClassification: [card.subtitle, card.kind, ...card.genres].filter(Boolean).join(' · '),
    statusText: status === 'geannuleerd' ? 'geannuleerd' : status === 'uitverkocht' || detail?.soldOut ? 'uitverkocht' : undefined,
    extraUncertainties: detail ? undefined : ['Aanvangstijd niet opgehaald; kijk bij de bron'],
    kind: card.kind === 'Club' ? 'Uitgaan' : card.kind === 'Talent' ? 'Concert · Talent' : card.kind === 'Live' ? 'Concert' : undefined,
    indoor: card.room && /tuin/i.test(card.room) ? 'buiten' : 'binnen',
    checkedAt: nowIso,
  };
}

export const burgerweeshuis: SourceAdapter = {
  id: ID,
  name: NAME,
  homepage: `${BASE}/programma`,
  method: 'html',
  description: 'Concerten, clubavonden en talentavonden van poppodium Burgerweeshuis, uit het programma en de pagina per voorstelling.',
  async run(ctx: AdapterContext): Promise<AdapterResult> {
    const cards = parseBwhList(await fetchText(`${BASE}/programma`));
    if (!cards.length) throw new Error('Burgerweeshuis: geen voorstellingen op /programma gevonden');
    const events: RawEvent[] = [];
    let n = 0;
    for (const card of cards) {
      const guess = bwhListDate(card.dateText, ctx.today);
      if (guess && (guess < ctx.today || guess > ctx.until)) continue;
      let detail: BwhDetail | undefined;
      if (n < ctx.maxDetailPages) {
        n++;
        try {
          detail = parseBwhDetail(await fetchText(card.url));
        } catch (e) {
          ctx.log(`  fout bij ${card.url}: ${(e as Error).message}`);
        }
      }
      const ev = bwhToRaw(card, detail, ctx.today, ctx.nowIso);
      if (ev && ev.start.slice(0, 10) >= ctx.today && ev.start.slice(0, 10) <= ctx.until) events.push(ev);
    }
    return { events, coverage: { from: ctx.today, to: ctx.until }, notes: `${n} detailpagina's` };
  },
};
