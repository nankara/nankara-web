// Client for the admin API — products, categories, media, shipping zones, orders,
// dashboard overview.
//
// Auth is a session cookie (HttpOnly, set by the backend on login) — the browser
// can't read it, so we never touch a token here. Every call is same-origin
// through the /api/v1 proxy and sends the cookie automatically; the backend also
// checks the request Origin on state-changing calls.

async function parse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(`Admin API ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function adminFetch(path, { method = 'GET', body } = {}) {
  const hasBody = body !== undefined;
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });
  return parse(res);
}

async function adminUpload(path, formData) {
  const res = await fetch(`/api/v1${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { accept: 'application/json' }, // browser sets the multipart boundary
    body: formData,
  });
  return parse(res);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function adminLogin(email, password) {
  return adminFetch('/admin/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function adminLogout() {
  return adminFetch('/admin/auth/logout', { method: 'POST' });
}

export function getAdminMe() {
  return adminFetch('/admin/auth/me');
}

export function changeAdminPassword(body) {
  return adminFetch('/admin/auth/password', { method: 'POST', body });
}

// ── Products ──────────────────────────────────────────────────────────────────

export function getAdminProducts() {
  return adminFetch('/admin/products');
}

export function getAdminProduct(id) {
  return adminFetch(`/admin/products/${id}`);
}

export function createProduct(body) {
  return adminFetch('/admin/products', { method: 'POST', body });
}

export function updateProduct(id, body) {
  return adminFetch(`/admin/products/${id}`, { method: 'PATCH', body });
}

// The backend expects a bare JSON array of {url, public_id, alt_text, is_primary};
// list order becomes sort order, and it replaces the whole set.
export function replaceProductImages(id, images) {
  return adminFetch(`/admin/products/${id}/images`, { method: 'PUT', body: images });
}

export function getAdminCategories() {
  return adminFetch('/admin/categories');
}

export function createCategory(body) {
  return adminFetch('/admin/categories', { method: 'POST', body });
}

export function uploadMedia(file) {
  const fd = new FormData();
  fd.append('file', file);
  return adminUpload('/admin/media/upload', fd);
}

// ── Shipping ──────────────────────────────────────────────────────────────────

export function getShippingZones() {
  return adminFetch('/admin/shipping-zones');
}

export function updateShippingZone(id, body) {
  return adminFetch(`/admin/shipping-zones/${id}`, { method: 'PATCH', body });
}

export function getOverview() {
  return adminFetch('/admin/overview');
}

export function getAdminOrders({ status } = {}) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return adminFetch(`/admin/orders${qs}`);
}

export function getAdminOrder(id) {
  return adminFetch(`/admin/orders/${id}`);
}

export function updateAdminOrderStatus(id, status) {
  return adminFetch(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

// ── Inbox (brand-page forms) ──────────────────────────────────────────────────

export function getInboxMessages({ kind, handled } = {}) {
  const params = new URLSearchParams();
  if (kind) params.set('kind', kind);
  if (handled !== undefined) params.set('handled', String(handled));
  const qs = params.toString();
  return adminFetch(`/admin/inbox${qs ? `?${qs}` : ''}`);
}

export function getInboxMessage(id) {
  return adminFetch(`/admin/inbox/${id}`);
}

export function setInboxHandled(id, isHandled) {
  return adminFetch(`/admin/inbox/${id}`, {
    method: 'PATCH',
    body: { is_handled: isHandled },
  });
}

export function getNewsletterSubscribers() {
  return adminFetch('/admin/newsletter');
}
