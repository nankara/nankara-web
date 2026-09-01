// Pure helpers for the public brand-page forms (contact, consultation,
// newsletter). Framework-free so they can be unit-tested; the backend is
// authoritative and re-validates everything.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value) {
  return EMAIL_RE.test((value || '').trim());
}

export function contactErrors(form) {
  const e = {};
  if (!(form.name || '').trim()) e.name = 'Please enter your name.';
  if (!isEmail(form.email)) e.email = 'Please enter a valid email.';
  if (!(form.message || '').trim()) e.message = 'Please include a message.';
  return e;
}

export function consultationErrors(form) {
  const e = {};
  if (!(form.name || '').trim()) e.name = 'Please enter your full name.';
  if (!isEmail(form.email)) e.email = 'Please enter a valid email.';
  if (!(form.country || '').trim()) e.country = 'Please enter your country of residence.';
  if (!(form.goal || '').trim()) e.goal = 'Please share what you look forward to achieving.';
  if (!(form.whatsapp || '').trim()) e.whatsapp = 'Please enter a WhatsApp number.';
  return e;
}

export function newsletterEmailError(email) {
  return isEmail(email) ? '' : 'Please enter a valid email address.';
}

export function buildContactPayload(form) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    subject: (form.subject || 'General Inquiry').trim(),
    message: form.message.trim(),
    website: form.website || '',
  };
}

export function buildConsultationPayload(form) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    country: form.country.trim(),
    whatsapp: form.whatsapp.trim(),
    goal: form.goal.trim(),
    website: form.website || '',
  };
}

export function hasErrors(...objs) {
  return objs.some((o) => Object.keys(o).length > 0);
}
