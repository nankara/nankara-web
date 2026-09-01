// Thin client for the public storefront endpoints of the FastAPI backend.
//
// In the browser we call the same-origin path `/api/v1/...`, which next.config.mjs
// rewrites to the backend (no CORS, backend host not exposed). On the server we hit
// the backend directly — there is no point bouncing a server request through Next's
// own proxy.

function baseUrl() {
  if (typeof window !== 'undefined') return '';
  return process.env.BACKEND_ORIGIN || 'http://localhost:8000';
}

async function apiGet(path, { revalidate = 60, fresh = false } = {}) {
  const init = { headers: { accept: 'application/json' } };

  if (fresh) {
    init.cache = 'no-store';
  } else if (typeof window === 'undefined') {
    // ISR for server-rendered pages; the catalogue changes rarely.
    init.next = { revalidate };
  }

  const res = await fetch(`${baseUrl()}/api/v1${path}`, init);

  if (!res.ok) {
    const error = new Error(`API ${res.status} for ${path}`);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${baseUrl()}/api/v1${path}`, {
    method: 'POST',
    // Carries the optional customer session cookie so an order placed while
    // signed in is linked to the account. Harmless for guests.
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(`API ${res.status} for ${path}`);
    error.status = res.status;
    error.data = data; // FastAPI { detail: ... }
    throw error;
  }

  return data;
}

export function getProducts(opts) {
  return apiGet('/products', opts);
}

export function getProduct(slug, opts) {
  return apiGet(`/products/${encodeURIComponent(slug)}`, opts);
}

export function getCategories(opts) {
  return apiGet('/categories', opts);
}

export function requestShippingQuote({ countryCode, stateRegion }) {
  return apiPost('/shipping/quote', {
    country_code: countryCode,
    state_region: stateRegion || null,
  });
}

export function createOrder(payload) {
  return apiPost('/orders', payload);
}

export function getOrderConfirmation(reference) {
  return apiGet(`/orders/${encodeURIComponent(reference)}/confirmation`, { fresh: true });
}

// Payment (Milestone 4). The backend calls Paystack and returns a hosted-checkout
// URL; the secret key never reaches the browser.
export function initializePaystack(reference) {
  return apiPost('/payments/paystack/initialize', { reference });
}

// On-demand verification — the fallback for when the webhook hasn't landed yet
// (e.g. local dev). Safe to call repeatedly; the transition is idempotent.
export function verifyPayment(reference) {
  return apiPost('/payments/paystack/verify', { reference });
}

// Brand-page forms (spec §11) — stored in the admin inbox + emailed to the admin.
export function submitContactMessage(payload) {
  return apiPost('/inbox/contact', payload);
}

export function submitConsultationRequest(payload) {
  return apiPost('/inbox/consultation', payload);
}

export function subscribeNewsletter(email, source = 'footer', website = '') {
  return apiPost('/inbox/newsletter', { email, source, website });
}
