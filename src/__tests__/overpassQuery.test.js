import { describe, expect, it } from 'vitest';
import { validateOverpassQuery } from '../../api/overpass-query.js';

describe('validateOverpassQuery', () => {
  const validQuery = `[out:json][timeout:15];
(
  node["amenity"="fuel"](1,2,3,4);
);
out center 100;`;

  it('accepts standard Overpass QL', () => {
    expect(validateOverpassQuery(validQuery).ok).toBe(true);
  });

  it('rejects missing query', () => {
    expect(validateOverpassQuery('').ok).toBe(false);
  });

  it('rejects non-json output format', () => {
    expect(validateOverpassQuery('[out:xml]; node(1); out;').ok).toBe(false);
  });

  it('rejects recursive >; construct', () => {
    expect(validateOverpassQuery('[out:json]; node(1); >; out;').ok).toBe(false);
  });
});
