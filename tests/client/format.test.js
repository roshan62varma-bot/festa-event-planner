import { describe, expect, it } from 'vitest';
import { countdownText, formatDate, matchVendorType, parseSwatch } from '../../src/lib/format.js';

describe('formatDate', () => {
  it('formats ISO dates as local dates, never shifted by time zone', () => {
    expect(formatDate('2027-02-17')).toBe('Wed, Feb 17, 2027');
    expect(formatDate('2027-01-01')).toBe('Fri, Jan 1, 2027');
  });
});

describe('countdownText', () => {
  it.each([
    [12, '12 days to go'],
    [1, 'Tomorrow'],
    [0, 'Today'],
    [-3, 'Event has passed'],
  ])('%i days -> %s', (days, text) => expect(countdownText(days)).toBe(text));
});

describe('parseSwatch', () => {
  it('splits a name from a hex colour', () => {
    expect(parseSwatch('Marigold #F2A900')).toEqual({ name: 'Marigold', hex: '#F2A900' });
    expect(parseSwatch('#123abc')).toEqual({ name: '#123abc', hex: '#123abc' });
  });

  it('never returns anything but a strict hex colour for CSS', () => {
    expect(parseSwatch('Midnight')).toEqual({ name: 'Midnight', hex: null });
    expect(parseSwatch('red; background:url(x)')).toEqual({ name: 'red; background:url(x)', hex: null });
    expect(parseSwatch('#12345')).toMatchObject({ hex: null });
  });
});

describe('matchVendorType', () => {
  it.each([
    ['Catering company', 'Caterer'],
    ['Wedding photographer', 'Photographer'],
    ['DJ', 'DJ or band'],
    ['Florist and decor', 'Decorator'],
    ['Something odd', 'Venue'],
    [undefined, 'Venue'],
  ])('%s -> %s', (input, expected) => expect(matchVendorType(input)).toBe(expected));
});
