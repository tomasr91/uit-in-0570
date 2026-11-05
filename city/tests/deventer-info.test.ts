/** Adapter deventer.info, op ingekorte pagina's uit de diagnose van 5-11-2026. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diToRaw, parseDiDetail, parseDiList, splitPlace, withCategories, withDetail } from '../adapters/deventer-info';

const fx = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
const DAY = '2026-11-07';

describe('deventer.info', () => {
  const { cards, hasNext } = parseDiList(fx('di-dag.html'));

  it('leest de kaarten van een dagpagina en ziet dat er een volgende pagina is', () => {
    expect(hasNext).toBe(true);
    expect(cards.map((c) => c.id)).toEqual(['182773', '172420', '172473']);
    expect(cards[2]).toMatchObject({ title: 'Speelgoedmuseum Deventer', times: '11:00 - 17:00', place: 'Speelgoedmuseum Deventer, Brink 47', price: '€ 5,00 - € 9,00' });
  });

  it('maakt een activiteit met tijden, plek en adres, zonder de tekst van de kaart', () => {
    const ev = diToRaw(cards[0], DAY, true, 'nu')!;
    expect(ev).toMatchObject({
      sourceEventId: 'di-182773-2026-11-07', seriesKey: 'di-182773', start: '2026-11-07T10:00', end: '2026-11-07T12:00',
      venueName: 'Etty Hillesum Centrum', address: 'Roggestraat 3, Deventer', priceText: '€ 25,00', hints: ['Kinderen'],
    });
    expect(ev.summary).toBeUndefined();
    expect(diToRaw(cards[0], '2026-11-08', false, 'nu')).toBeUndefined();
  });

  it('voorstellingen van de Deventer Schouwburg komen mee', () => {
    const [c] = parseDiList(fx('di-theater.html')).cards;
    expect(withCategories(diToRaw(c, DAY, false, 'nu')!, ['Theater'])).toMatchObject({
      title: 'Titanique', start: '2026-11-07T20:00', venueName: 'Deventer Schouwburg', address: 'Leeuwenbrug 2, Deventer', kind: 'Theater',
    });
  });

  it('adres zonder komma of met een link', () => {
    expect(splitPlace('Startpunt Nijendalhttps://maps.app.goo.gl/x')).toEqual({ venueName: 'Startpunt Nijendal' });
    expect(splitPlace('PS48 AteliersPolstraat 48')).toEqual({ venueName: 'PS48 AteliersPolstraat 48' });
  });

  it('detailtekst alleen voor de indeling, niet als samenvatting', () => {
    const d = parseDiDetail(fx('di-detail.html'));
    expect(d.text).toMatch(/Speelgoedmuseum/);
    const ev = withDetail(diToRaw(cards[2], DAY, false, 'nu')!, d);
    expect(ev.descriptionForClassification).toBe(d.text);
    expect(ev.summary).toBeUndefined();
  });
});
