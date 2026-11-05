/** Adapters Burgerweeshuis en MIMIK, op ingekorte pagina's uit de diagnose van 5-11-2026. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bwhToRaw, parseBwhDetail, parseBwhList } from '../adapters/burgerweeshuis';
import { mimikToRaw, parseMimikPage, parseMimikSitemap } from '../adapters/mimik';

const fx = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
const TODAY = '2026-11-05';
const UNTIL = '2027-04-30';

describe('Burgerweeshuis', () => {
  const cards = parseBwhList(fx('bwh-programma.html'));
  const bySlug = (s: string) => cards.find((c) => c.slug === s)!;

  it('leest de kaarten van /programma', () => {
    expect(cards.map((c) => c.slug)).toContain('motorpsycho');
    const c = bySlug('cloudsurfers-grote-geelstaart');
    expect(c).toMatchObject({ dateText: 'do 5 nov', kind: 'Live', room: 'Concertzaal', title: 'Grote Geelstaart // Cloudsurfers' });
    expect(c.genres).toEqual(['punk', 'rock']);
    expect(c.status).toBeUndefined();
    expect(bySlug('mister-and-mississippi')).toMatchObject({ status: 'Uitverkocht', room: 'Het Penninckshuis' });
    expect(bySlug('luwten').status).toBe('Geannuleerd');
  });

  it('detailpagina: datum uit JSON-LD, aanvang en prijs uit de zichtbare vakjes', () => {
    expect(parseBwhDetail(fx('bwh-detail.html'))).toMatchObject({
      date: '2027-04-10', doors: '19:30', start: '20:00', end: '23:30', price: '€ 32,00', soldOut: false, free: false,
    });
  });

  it('maakt een concert op aanvangstijd, met status en zaal', () => {
    const ev = bwhToRaw(bySlug('motorpsycho'), parseBwhDetail(fx('bwh-detail.html')), TODAY, 'nu')!;
    expect(ev).toMatchObject({ start: '2027-04-10T20:00', end: '2027-04-10T23:30', venueName: 'Burgerweeshuis, Concertzaal', priceText: '€ 32,00', audiences: ['volwassenen'] });
    expect(bwhToRaw(bySlug('mister-and-mississippi'), undefined, TODAY, 'nu')).toMatchObject({
      start: '2026-11-21', allDay: true, statusText: 'uitverkocht', venueName: 'Het Penninckshuis',
    });
    expect(bwhToRaw(bySlug('luwten'), undefined, TODAY, 'nu')!.statusText).toBe('geannuleerd');
    expect(bwhToRaw(bySlug('science-cafe-bacterien-op-oorlogspad'), undefined, TODAY, 'nu')!.kind).toBeUndefined();
  });
});

describe('MIMIK', () => {
  it('neemt alleen /agenda/<slug> uit de sitemap', () => {
    expect(parseMimikSitemap(fx('mimik-sitemap.xml'))).toEqual([
      'https://www.mimik.nl/agenda/80-angry-journalists',
      'https://www.mimik.nl/agenda/wen-er-maar-aan',
    ]);
  });

  const page = parseMimikPage(fx('mimik-film.html'), 'https://www.mimik.nl/agenda/wen-er-maar-aan')!;

  it('leest speeltijden uit JSON-LD en koppelt zaal en prijs', () => {
    expect(page).toMatchObject({ title: 'Wen Er Maar Aan', genre: 'Film', kijkwijzer: '-6ans', durationMinutes: 104, screening: true });
    expect(page.shows).toHaveLength(4);
    expect(page.shows[0]).toEqual({ start: '2026-11-07T18:30', room: 'Filmzaal 1', price: '€ 13,00', soldOut: false });
  });

  it('een film wordt één item over de periode waarin hij draait', () => {
    const evs = mimikToRaw(page, TODAY, UNTIL, 'nu');
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ start: '2026-11-07', end: '2026-11-11', ongoing: true, categories: ['film'], kind: 'Film', audiences: ['volwassenen'] });
    expect(mimikToRaw(page, '2026-11-11', UNTIL, 'nu')[0]).toMatchObject({ start: '2026-11-11T16:00', allDay: false, venueName: 'MIMIK, Filmzaal 1' });
    expect(mimikToRaw(page, '2026-11-12', UNTIL, 'nu')).toEqual([]);
  });

  it('theater en Junior: één item per voorstelling; Junior is voor kinderen', () => {
    const theater = { ...page, genre: 'Junior', title: 'Voorstelling', kijkwijzer: undefined, screening: false };
    const evs = mimikToRaw(theater, TODAY, UNTIL, 'nu');
    expect(evs).toHaveLength(4);
    expect(evs[0]).toMatchObject({ start: '2026-11-07T18:30', audiences: ['kinderen', 'gezin'], kind: 'Jeugdtheater' });
  });

  it('een leeftijd in de titel maakt een kinderfilm en wordt uit de titel gehaald', () => {
    const html = fx('mimik-film.html').replaceAll('"name": "Wen Er Maar Aan"', '"name": "Dikkie Dik en de verdwenen knuffel (3&#x2B;)"');
    const kids = parseMimikPage(html, 'https://www.mimik.nl/agenda/dikkie-dik')!;
    expect(kids).toMatchObject({ title: 'Dikkie Dik en de verdwenen knuffel', minAge: 3 });
    expect(mimikToRaw(kids, TODAY, UNTIL, 'nu')[0]).toMatchObject({ kind: 'Kinderfilm', audiences: ['kinderen', 'gezin'], officialMinMonths: 36, ageLabel: '3+' });
  });

  it('"Club Kid" is geen kinderfilm', () => {
    const html = fx('mimik-film.html').replaceAll('"name": "Wen Er Maar Aan"', '"name": "Club Kid"');
    expect(mimikToRaw(parseMimikPage(html, 'https://www.mimik.nl/agenda/club-kid')!, TODAY, UNTIL, 'nu')[0].audiences).toEqual(['volwassenen']);
  });
});
