import { describe, expect, it } from 'vitest';

import {
  buildConsultationPayload,
  buildContactPayload,
  consultationErrors,
  contactErrors,
  hasErrors,
  newsletterEmailError,
} from './forms';

const CONTACT = {
  name: 'Ada Obi',
  email: 'ada@example.com',
  subject: 'General Inquiry',
  message: 'Hello there.',
};
const CONSULT = {
  name: 'Ada Obi',
  email: 'ada@example.com',
  country: 'Nigeria',
  whatsapp: '+2348012345678',
  goal: 'A wardrobe overhaul.',
};

describe('contactErrors', () => {
  it('passes a complete form', () => {
    expect(contactErrors(CONTACT)).toEqual({});
  });
  it('flags blanks and a bad email', () => {
    const e = contactErrors({ ...CONTACT, name: '  ', email: 'nope', message: '' });
    expect(e.name).toBeTruthy();
    expect(e.email).toBeTruthy();
    expect(e.message).toBeTruthy();
  });
});

describe('consultationErrors', () => {
  it('passes a complete form', () => {
    expect(consultationErrors(CONSULT)).toEqual({});
  });
  it('requires country, whatsapp and goal', () => {
    const e = consultationErrors({ ...CONSULT, country: '', whatsapp: '', goal: ' ' });
    expect(Object.keys(e).sort()).toEqual(['country', 'goal', 'whatsapp']);
  });
});

describe('newsletterEmailError', () => {
  it('empty for a valid email, message otherwise', () => {
    expect(newsletterEmailError('a@b.co')).toBe('');
    expect(newsletterEmailError('a@b')).toBeTruthy();
    expect(newsletterEmailError('')).toBeTruthy();
  });
});

describe('payload builders', () => {
  it('trims and defaults the contact subject', () => {
    const p = buildContactPayload({ ...CONTACT, subject: '', name: ' Ada ' });
    expect(p).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'General Inquiry',
      message: 'Hello there.',
      website: '',
    });
  });
  it('maps consultation fields and keeps the honeypot', () => {
    const p = buildConsultationPayload({ ...CONSULT, website: 'x' });
    expect(p.whatsapp).toBe('+2348012345678');
    expect(p.website).toBe('x');
  });
});

describe('hasErrors', () => {
  it('is true when any object has keys', () => {
    expect(hasErrors({}, { a: 1 })).toBe(true);
    expect(hasErrors({}, {})).toBe(false);
  });
});
