/** Zone-indeling voor Deventer met de binnenstad als thuiswijk. */
import { describe, expect, it } from 'vitest';
import { classifyZone } from '../../src/domain/geo';

describe('zones in Deventer', () => {
  it('binnenstad en Bergkwartier zijn de thuiswijk', () => {
    expect(classifyZone({ name: 'Speelgoedmuseum Deventer', locality: 'Binnenstad', geoPrecision: 'unknown' })).toBe('binnenstad');
    expect(classifyZone({ name: 'Dickens Festijn', locality: 'Bergkwartier', geoPrecision: 'unknown' })).toBe('binnenstad');
  });
  it('wijken en dorpen van de gemeente horen bij Deventer', () => {
    expect(classifyZone({ name: 'Speeltuin', locality: 'Colmschate', geoPrecision: 'unknown' })).toBe('deventer');
    expect(classifyZone({ name: 'Intocht', locality: 'Schalkhaar', geoPrecision: 'unknown' })).toBe('deventer');
    expect(classifyZone({ name: 'De Scheg', address: 'Piet van Donkplein 1, 7422 LW Deventer', geoPrecision: 'unknown' })).toBe('deventer');
  });
  it('buiten de gemeente is omgeving', () => {
    expect(classifyZone({ name: 'Theater', locality: 'Zutphen', geoPrecision: 'unknown' })).toBe('omgeving');
    expect(classifyZone({ name: 'Paleis Het Loo', locality: 'Apeldoorn', geoPrecision: 'unknown' })).toBe('omgeving');
  });
  it('zonder plaatsnaam: dicht bij de Brink is binnenstad, Colmschate is Deventer', () => {
    expect(classifyZone({ name: 'X', lat: 52.2525, lon: 6.1585, geoPrecision: 'approx' })).toBe('binnenstad');
    expect(classifyZone({ name: 'Y', lat: 52.2480, lon: 6.2150, geoPrecision: 'approx' })).toBe('deventer');
  });
});
