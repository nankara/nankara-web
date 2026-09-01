# Nankara Shop API

FastAPI + PostgreSQL backend for the Nankara commerce MVP. Lives alongside the
Next.js frontend in this monorepo. Spec: [`../NANKARA_SHOP_MVP.md`](../NANKARA_SHOP_MVP.md).

## Status — Milestones 1–4

**M1 — data + product administration**

- Admin authentication (JWT bearer tokens, bcrypt password hashing)
- `admins`, `categories`, `products`, `product_images` tables + Alembic migration
- Admin category CRUD
- Admin product CRUD (create / list / read / update, publish + availability)
- Product image management via Cloudinary (upload endpoint + ordered replace)
- Public read endpoints for the storefront (published products only)
- Admin overview counts
- Frontend `/admin/products` screens — create / edit / publish / stock / images /
  inline category creation (added 2026-08-31; plan `../ADMIN_PRODUCT_UI_PLAN.md`)

**M3 — checkout + shipping**

- `shipping_zones`, `orders`, `order_items` tables + `order_status` enum (migration `0002`)
- `POST /api/v1/shipping/quote` — destination → authoritative flat rate (spec §11)
- `POST /api/v1/orders` — recalculates every price + shipping server-side, creates a
  `PENDING_PAYMENT` order with an item snapshot; `409` (whole order) if any line can't be
  fulfilled, `422` empty cart / unquotable destination (spec §12, §24, §28)
- `GET /api/v1/orders/{reference}/confirmation` — public, unguessable reference, safe fields only
- `GET / PATCH /api/v1/admin/shipping-zones` — admin rate + active-flag editing
- `pytest` suite under `tests/`

**M4 — payment + orders**

- `payments` table + `payment_status` enum (`PENDING/SUCCESS/FAILED/ABANDONED`), migration `0003`.
  `amount` is stored in **kobo** (`order.total * 100`).
- `POST /api/v1/payments/paystack/initialize` — creates a `PENDING` payment, calls Paystack
  `/transaction/initialize`, returns the hosted-checkout `authorization_url`. `409` if the
  order isn't awaiting payment; `503` if `PAYSTACK_SECRET_KEY` is unset.
- `POST /api/v1/payments/paystack/webhook` — HMAC-SHA512 signature check over the raw body
  (`401` on mismatch), then applies `charge.success` **once** per `provider_reference`
  (amount + currency re-checked) and moves the order `PENDING_PAYMENT → PAID`. Always `200`
  on a valid signature so Paystack stops retrying.
- `POST /api/v1/payments/paystack/verify` — on-demand verification against Paystack, the
  fallback for when a webhook hasn't landed (local dev). Same idempotent transition.
- `GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/{id}`,
  `PATCH /api/v1/admin/orders/{id}/status` — admin order list / detail / fulfilment.
  Status moves are a forward-only whitelist (`PAID → IN_PRODUCTION → READY → SHIPPED →
  DELIVERED`, or `CANCELLED`); `PAID`/`PENDING_PAYMENT` can't be set by hand — `409` otherwise.
- `GET /api/v1/admin/overview` also returns order counts (pending payment / paid / in
  production / awaiting shipment).
- `python -m app.cli seed-demo-orders` — dev-only demo orders across statuses for the admin UI.
- `httpx` is now a runtime dependency (the Paystack client).

**Customer accounts** — `users` / `user_addresses` / `measurement_profiles`
(migration `0005`), `orders.user_id` now an FK. `/api/v1/account/*`: register /
login / logout (session cookie `nk_customer`), `me`, password change + forgot +
reset, email verification, order history, address book, measurement profile.
Guest checkout is unchanged and still the default; a signed-in buyer's order is
linked to their account, and registering claims prior guest orders on the same
email. When a signed-in customer checks out, `create_order` also adds the
delivery address to their address book (deduped) and backfills an empty profile
phone — best-effort, in a SAVEPOINT, never blocks the order. Email goes through
Resend (`RESEND_API_KEY`, optional in dev — flows still succeed and just skip
sending; a non-2xx logs Resend's response body). Admin:
`GET /api/v1/admin/customers[/{id}]`, and the order detail shows the linked account.

Milestones 1–4 + auth hardening + customer accounts are done. Next: launch
hardening finish (real Paystack run, prod env / HTTPS, real shipping rates,
DB backups, mobile QA).

## Requirements

- Python 3.11–3.13 (3.14 has no wheels for the pinned deps yet — use `uv`, below,
  which pins 3.12 automatically)
- PostgreSQL 14+ (the bundled `docker-compose.yml` runs one on host port **5433**)
- A Cloudinary account (for image uploads)

## Setup

```bash
cd backend

# with uv (recommended — handles the Python version)
uv venv --python 3.12 .venv
uv pip install -r requirements-dev.txt      # or requirements.txt for prod only
source .venv/bin/activate

# or with stock tooling, if you have Python 3.12/3.13:
#   python3.12 -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt

cp .env.example .env
# edit .env: set SECRET_KEY (openssl rand -hex 32) and the CLOUDINARY_* values

# start Postgres (or point DATABASE_URL at your own)
docker compose up -d

# create the schema
alembic upgrade head

# create the first admin + starter categories + shipping zones
python -m app.cli create-admin --email you@nankara.com --password 'a-strong-password'
python -m app.cli seed-categories
python -m app.cli seed-shipping-zones      # 9 zones, DUMMY rates — replace before launch (§11)

# optional: development-only sample data for exercising the UI
python -m app.cli seed-demo-products       # sample catalogue
python -m app.cli seed-demo-orders         # a few orders across statuses (for /admin/orders)

# run
uvicorn app.main:app --reload --port 8000
```

Interactive docs: <http://localhost:8000/docs>

## Auth flow (admin)

1. `POST /api/v1/admin/auth/login` with `{ "email", "password" }` → **sets an
   `nk_admin` session cookie** (`HttpOnly; Secure` in prod; `SameSite=Lax`). The
   response body is just the admin record — no token is exposed to JavaScript.
2. The browser sends the cookie automatically on every same-origin `/api/v1/*`
   call. On a state-changing request, **if** an `Origin`/`Referer` is present it
   must be in `CORS_ORIGINS` (a same-origin CSRF guard); origin-less requests
   like `curl` / server-to-server are allowed.
3. The session JWT carries `aud` (`nankara-admin`) and `tv` (the admin's
   `token_version`). `POST /api/v1/admin/auth/password` and
   `python -m app.cli reset-admin-password` bump `token_version`, which
   immediately invalidates every other session. `logout` clears the cookie.
4. Login and password change are rate-limited (5/min/IP). Order creation and the
   payment/confirmation endpoints are rate-limited too.
5. In `ENVIRONMENT=production` the app **refuses to start** with the default
   `SECRET_KEY`, a key shorter than 32 chars, or a `localhost` CORS origin; and
   `/docs`, `/redoc`, `/openapi.json` are disabled.

## API surface

### Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/products` | Published products, newest first |
| GET | `/api/v1/products/{slug}` | Published product by slug |
| GET | `/api/v1/categories` | All categories |
| POST | `/api/v1/shipping/quote` | `{ country_code, state_region }` → `{ zone_code, zone_name, amount, currency }`; 422 if unshippable |
| POST | `/api/v1/orders` | Guest checkout — creates a `PENDING_PAYMENT` order (see below) |
| GET | `/api/v1/orders/{reference}/confirmation` | Public-safe order view, keyed on the unguessable reference |
| POST | `/api/v1/payments/paystack/initialize` | `{ reference }` → `{ authorization_url, reference }`; 409 if not payable, 503 if unconfigured |
| POST | `/api/v1/payments/paystack/webhook` | Paystack `charge.success` — signed, idempotent; moves the order to `PAID` |
| POST | `/api/v1/payments/paystack/verify` | `{ reference }` → public-safe order view; on-demand verification fallback |
| POST | `/api/v1/inbox/contact` | Brand-page contact form → stored + emails the admin. Rate-limited 5/min; a filled `website` honeypot is silently dropped. |
| POST | `/api/v1/inbox/consultation` | Identity-consultation request → same. |
| POST | `/api/v1/inbox/newsletter` | `{ email }` → `newsletter_subscribers` (idempotent). |
| GET | `/health` | Liveness |

### Admin (bearer token required)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/admin/auth/login` | Sets the `nk_admin` session cookie |
| POST | `/api/v1/admin/auth/logout` | Clears the cookie; 204 |
| GET | `/api/v1/admin/auth/me` | Current admin |
| POST | `/api/v1/admin/auth/password` | `{ current_password, new_password }` — bumps `token_version` |
| GET | `/api/v1/admin/overview` | Dashboard counts |
| GET/POST | `/api/v1/admin/categories` | |
| PATCH/DELETE | `/api/v1/admin/categories/{id}` | Delete nulls the FK on products |
| GET/POST | `/api/v1/admin/products` | List includes drafts |
| GET/PATCH | `/api/v1/admin/products/{id}` | |
| PUT | `/api/v1/admin/products/{id}/images` | Replace full ordered image list |
| POST | `/api/v1/admin/media/upload` | multipart `file` → `{ url, public_id }` |
| GET | `/api/v1/admin/shipping-zones` | All zones + rates |
| PATCH | `/api/v1/admin/shipping-zones/{id}` | `{ rate?, is_active? }` |
| GET | `/api/v1/admin/orders` | Order list, newest first; `?status=` / `?payment=` filters |
| GET | `/api/v1/admin/orders/{id}` | Full order detail (customer, address, payment) |
| PATCH | `/api/v1/admin/orders/{id}/status` | `{ status }` — forward-only fulfilment moves; 409 otherwise |
| GET | `/api/v1/admin/inbox` | Contact + consultation submissions; `?kind=` / `?handled=` filters |
| GET/PATCH | `/api/v1/admin/inbox/{id}` | Detail / `{ is_handled }` |
| GET | `/api/v1/admin/newsletter` | Newsletter subscriber list + count |

Form notifications are emailed to the **oldest active admin's address** (see
`app/inbox/service.admin_notification_email`) — deliberately the Resend account
owner, so they land even before a Resend sending domain is verified.

### Typical "add a product" sequence

1. For each photo: `POST /api/v1/admin/media/upload` → keep `{ url, public_id }`.
2. `POST /api/v1/admin/products` with the fields (optionally an `images` array).
3. Or set images later: `PUT /api/v1/admin/products/{id}/images` with
   `[{ url, public_id, alt_text, is_primary }]` — array order becomes display
   order; images dropped from the list are removed from Cloudinary.

### `POST /api/v1/orders` body

```jsonc
{
  "contact":  { "first_name": "", "last_name": "", "email": "", "phone": "" },
  "delivery": { "country_code": "NG", "country_name": "Nigeria",
                "address_1": "", "address_2": "", "city": "", "state_region": "",
                "postal_code": "", "notes": "" },
  "items":    [ { "product_id": 1, "quantity": 2 } ]
}
```

The server ignores any price/total sent in the body — `unit_price`, `subtotal`,
`shipping_amount` and `total` are recomputed from `products.price_ngn` and the resolved
`shipping_zones.rate`. Availability is re-checked; if any line fails the **whole** order is
rejected with `409` and `detail.items` lists the offending products.

## Tests

```bash
pytest                       # from backend/, with the venv active
```

Runs against a `<db>_test` database on the same Postgres server (created on first run),
schema built from the models, one transaction rolled back per test. Postgres must be up
(`docker compose up -d`).

## Migrations

```bash
alembic revision --autogenerate -m "describe change"   # after editing models
alembic upgrade head
alembic downgrade -1
alembic check                                          # models vs. migrations in sync?
```

`alembic/env.py` pulls the database URL from `app.core.config`, so there is no
URL in `alembic.ini`.

## Notes / decisions

- **Price** is stored as whole Naira in `products.price_ngn` (integer). USD is a
  display-only conversion, added in a later milestone.
- **Slugs** auto-generate from the name and are only regenerated on update when a
  `slug` is explicitly passed, so shared product URLs stay stable.
- **Multiple admins** are supported by the schema; only one is needed at launch.
- **CORS** is restricted to `CORS_ORIGINS` (comma-separated) from `.env`.
- **Payments** — `PAYSTACK_SECRET_KEY` (test or live) enables the payment endpoints;
  without it they return `503`. `FRONTEND_ORIGIN` builds the Paystack `callback_url`
  (`{FRONTEND_ORIGIN}/order/{reference}/success`). The webhook is verified with
  HMAC-SHA512 over the raw body using the same secret key. Locally there is no public
  webhook URL — the storefront's success page calls `/payments/paystack/verify` as a
  fallback; use `ngrok` (or similar) to exercise the real webhook.
- **Payment amounts** are stored in kobo (`payments.amount`); order money stays whole Naira.
