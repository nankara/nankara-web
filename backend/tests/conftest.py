"""Pytest fixtures.

Tests run against a dedicated `<database>_test` database on the same Postgres
server the app is configured for. The schema is built from the models with
`create_all` (the Postgres ENUM types come along for free); every test runs inside
a transaction that is rolled back afterward, so rows never accrete.
"""

import hashlib
import hmac
import json

import psycopg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.cli import DEFAULT_SHIPPING_ZONES
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import (
    AUDIENCE_ADMIN,
    AUDIENCE_CUSTOMER,
    SESSION_COOKIE_ADMIN,
    SESSION_COOKIE_CUSTOMER,
    create_token,
    hash_password,
)
from app.main import app
from app.models import Admin, Availability, Product, ShippingZone, User
from app.orders.service import create_order
from app.schemas.order import OrderCreate

# The real frontend always sends an Origin; the same-origin CSRF guard requires it.
_TRUSTED_ORIGIN = settings.cors_origins[0]

_TEST_DB = "nankara_test"


def _test_database_url() -> str:
    url = settings.database_url
    base, _, _current = url.rpartition("/")
    return f"{base}/{_TEST_DB}"


def _ensure_test_database() -> None:
    admin_url = settings.database_url.rpartition("/")[0] + "/postgres"
    dsn = admin_url.replace("postgresql+psycopg://", "postgresql://")
    with psycopg.connect(dsn, autocommit=True) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (_TEST_DB,)
        ).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{_TEST_DB}"')


@pytest.fixture(scope="session")
def engine():
    _ensure_test_database()
    eng = create_engine(_test_database_url(), future=True)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture()
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection, autoflush=False, future=True)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Rate-limit state is process-wide; clear it between tests."""
    from app.core.ratelimit import limiter

    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, headers={"origin": _TRUSTED_ORIGIN}) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin(db) -> Admin:
    record = Admin(
        email="admin@nankara.example", password_hash=hash_password("test-password")
    )
    db.add(record)
    db.flush()
    return record


@pytest.fixture()
def admin_client(client, admin):
    """A TestClient carrying a valid admin session cookie."""
    token = create_token(
        str(admin.id),
        audience=AUDIENCE_ADMIN,
        token_version=admin.token_version,
        ttl_minutes=60,
    )
    client.cookies.set(SESSION_COOKIE_ADMIN, token)
    return client


@pytest.fixture()
def customer(db) -> User:
    record = User(
        email="ada@example.com",
        password_hash=hash_password("customer-pass"),
        first_name="Ada",
        last_name="Obi",
        phone="+2348012345678",
        email_verified=True,
    )
    db.add(record)
    db.flush()
    return record


@pytest.fixture()
def customer_client(client, customer):
    token = create_token(
        str(customer.id),
        audience=AUDIENCE_CUSTOMER,
        token_version=customer.token_version,
        ttl_minutes=60,
    )
    client.cookies.set(SESSION_COOKIE_CUSTOMER, token)
    return client


@pytest.fixture()
def fake_resend(monkeypatch):
    """Record outbound emails instead of sending."""
    sent: list[dict] = []
    recorder = lambda **kw: (sent.append(kw), True)[1]  # noqa: E731
    monkeypatch.setattr("app.customers.emails.send_email", recorder)
    monkeypatch.setattr("app.inbox.emails.send_email", recorder)
    return sent


@pytest.fixture()
def seeded_zones(db) -> list[ShippingZone]:
    zones = [
        ShippingZone(code=code, name=name, region_type=region_type, rate=rate)
        for code, name, region_type, rate in DEFAULT_SHIPPING_ZONES
    ]
    db.add_all(zones)
    db.flush()
    return zones


_ORDER_CONTACT = {
    "first_name": "Ada",
    "last_name": "Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
}
_ORDER_DELIVERY_NG = {
    "country_code": "NG",
    "country_name": "Nigeria",
    "address_1": "12 Aptech Close",
    "address_2": "",
    "city": "Port Harcourt",
    "state_region": "Rivers",
    "postal_code": "",
    "notes": "",
}


@pytest.fixture()
def make_order(db, seeded_zones, make_product):
    """Create a persisted PENDING_PAYMENT order (Rivers shipping = 5000)."""

    def _make(*, price_ngn: int = 100000, quantity: int = 1):
        product = make_product(price_ngn=price_ngn)
        return create_order(
            db,
            OrderCreate(
                contact=_ORDER_CONTACT,
                delivery=_ORDER_DELIVERY_NG,
                items=[{"product_id": product.id, "quantity": quantity}],
            ),
        )

    return _make


@pytest.fixture()
def paystack_secret(monkeypatch):
    monkeypatch.setattr(settings, "paystack_secret_key", "test-secret-key")
    return "test-secret-key"


@pytest.fixture()
def fake_paystack(monkeypatch):
    """Stub the Paystack HTTP client. `.verify_result` tunes the verify response."""

    class _Stub:
        verify_result = {"status": "success", "amount": None, "currency": "NGN"}
        init_calls: list[dict] = []

        def initialize_transaction(self, **kwargs):
            self.init_calls.append(kwargs)
            return {
                "authorization_url": "https://checkout.paystack.com/xyz123",
                "access_code": "xyz123",
                "reference": kwargs["reference"],
            }

        def verify_transaction(self, reference):
            return dict(self.verify_result)

    stub = _Stub()
    monkeypatch.setattr(
        "app.payments.paystack_client.initialize_transaction",
        stub.initialize_transaction,
    )
    monkeypatch.setattr(
        "app.payments.paystack_client.verify_transaction",
        stub.verify_transaction,
    )
    return stub


@pytest.fixture()
def signed_webhook(paystack_secret):
    """Build (raw_body, headers) for a signed Paystack webhook request."""

    def _make(event: dict):
        raw = json.dumps(event).encode("utf-8")
        sig = hmac.new(
            paystack_secret.encode("utf-8"), raw, hashlib.sha512
        ).hexdigest()
        return raw, {"x-paystack-signature": sig}

    return _make


@pytest.fixture()
def make_product(db):
    counter = {"n": 0}

    def _make(
        *,
        name: str | None = None,
        price_ngn: int = 100000,
        is_published: bool = True,
        availability: Availability = Availability.IN_STOCK,
    ) -> Product:
        counter["n"] += 1
        n = counter["n"]
        product = Product(
            name=name or f"Test Piece {n}",
            slug=f"test-piece-{n}",
            description="A test piece.",
            price_ngn=price_ngn,
            is_published=is_published,
            availability=availability,
        )
        db.add(product)
        db.flush()
        return product

    return _make
