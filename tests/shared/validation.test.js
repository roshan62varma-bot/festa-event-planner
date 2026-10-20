import { describe, expect, it } from 'vitest';
import {
  isValidISODate,
  sanitizeGuestSummary,
  sanitizeText,
  validateCreativeInput,
  validateEventInput,
} from '../../shared/validation.js';
import { TODAY, validEvent } from '../fixtures.js';

describe('sanitizeText', () => {
  it('strips control characters, collapses spaces and trims', () => {
    expect(sanitizeText('  hi\u0000 \u0007there   friend ', 50)).toBe('hi there friend');
  });
  it('caps length and rejects non-strings', () => {
    expect(sanitizeText('a'.repeat(100), 10)).toHaveLength(10);
    expect(sanitizeText({ toString: () => 'x' }, 10)).toBe('');
    expect(sanitizeText(undefined, 10)).toBe('');
  });
});

describe('isValidISODate', () => {
  it.each([
    ['2027-02-28', true],
    ['2027-02-30', false],
    ['2027-2-3', false],
    ['not a date', false],
    [20270101, false],
  ])('%s is %s', (value, expected) => expect(isValidISODate(value)).toBe(expected));
});

describe('validateEventInput', () => {
  it('accepts a complete brief and coerces numeric strings', () => {
    const { ok, value } = validateEventInput({ ...validEvent, guests: '60', budget: '2,50,000' }, { today: TODAY });
    expect(ok).toBe(true);
    expect(value.guests).toBe(60);
    expect(value.budget).toBe(250000);
  });

  it('reports every missing required field', () => {
    const { ok, errors } = validateEventInput({}, { today: TODAY });
    expect(ok).toBe(false);
    expect(Object.keys(errors).toSorted()).toEqual(['budget', 'currency', 'date', 'guests', 'name', 'type']);
  });

  it('rejects past dates, unknown types and out-of-range numbers', () => {
    const { errors } = validateEventInput(
      { ...validEvent, date: '2020-01-01', type: 'heist', guests: 0, budget: 5, currency: 'BTC' },
      { today: TODAY },
    );
    expect(errors).toMatchObject({
      date: expect.stringMatching(/passed/),
      type: expect.any(String),
      guests: expect.any(String),
      budget: expect.any(String),
      currency: expect.any(String),
    });
  });

  it('accepts an event happening today', () => {
    expect(validateEventInput({ ...validEvent, date: TODAY }, { today: TODAY }).ok).toBe(true);
  });

  it('never passes through unexpected keys', () => {
    const { value } = validateEventInput(
      { ...validEvent, __proto__: { admin: true }, role: 'system' },
      { today: TODAY },
    );
    expect(Object.keys(value).toSorted()).toEqual([
      'budget',
      'currency',
      'date',
      'guests',
      'location',
      'name',
      'notes',
      'type',
      'vibe',
    ]);
  });

  it('handles null and non-object input', () => {
    expect(validateEventInput(null).ok).toBe(false);
    expect(validateEventInput('wedding').ok).toBe(false);
  });
});

describe('validateCreativeInput', () => {
  it('requires a known kind and defaults optional fields', () => {
    expect(validateCreativeInput({ kind: 'nope' }).ok).toBe(false);
    const { ok, value } = validateCreativeInput({ kind: 'invite', tone: 'sarcastic', vendorType: 'Hacker' });
    expect(ok).toBe(true);
    expect(value).toMatchObject({ tone: 'warm', vendorType: 'Venue', guestSummary: null });
  });

  it('keeps only aggregate guest numbers', () => {
    const summary = sanitizeGuestSummary({
      attending: '12',
      pending: -4,
      groups: 3,
      dietary: { vegan: 2 },
      names: ['Asha'],
    });
    expect(summary).toEqual({ attending: 12, pending: 0, groups: 3, dietary: { vegan: 2 } });
  });
});
