from app.core.config import settings
from app.core.security import (
    AUDIENCE_ADMIN,
    AUDIENCE_CUSTOMER,
    SESSION_COOKIE_ADMIN,
    create_token,
)

LOGIN = "/api/v1/admin/auth/login"
ME = "/api/v1/admin/auth/me"
CREDS = {"email": "admin@nankara.example", "password": "test-password"}


# ── login / cookie issuance ──────────────────────────────────────────────────

def test_login_sets_httponly_cookie(client, admin):
    res = client.post(LOGIN, json=CREDS)
    assert res.status_code == 200
    assert "access_token" not in res.json()  # no token in the body anymore
    cookie = res.headers["set-cookie"].lower()
    assert cookie.startswith(f"{SESSION_COOKIE_ADMIN}=".lower())
    assert "httponly" in cookie
    assert "samesite=lax" in cookie


def test_login_then_me_works(client, admin):
    client.post(LOGIN, json=CREDS)
    res = client.get(ME)
    assert res.status_code == 200
    assert res.json()["email"] == "admin@nankara.example"


def test_login_bad_password(client, admin):
    assert client.post(LOGIN, json={**CREDS, "password": "wrong"}).status_code == 401


def test_login_inactive(client, admin, db):
    admin.is_active = False
    db.flush()
    assert client.post(LOGIN, json=CREDS).status_code == 403


# ── get_current_admin edge cases ─────────────────────────────────────────────

def test_no_cookie_is_401(client, admin):
    assert client.get(ME).status_code == 401


def test_tampered_signature_is_401(client, admin):
    client.cookies.set(SESSION_COOKIE_ADMIN, "not.a.jwt")
    assert client.get(ME).status_code == 401


def test_wrong_audience_is_401(client, admin):
    tok = create_token(
        str(admin.id), audience=AUDIENCE_CUSTOMER, token_version=0, ttl_minutes=60
    )
    client.cookies.set(SESSION_COOKIE_ADMIN, tok)
    assert client.get(ME).status_code == 401


def test_expired_token_is_401(client, admin):
    tok = create_token(
        str(admin.id), audience=AUDIENCE_ADMIN, token_version=0, ttl_minutes=-1
    )
    client.cookies.set(SESSION_COOKIE_ADMIN, tok)
    assert client.get(ME).status_code == 401


def test_stale_token_version_is_401(client, admin, db):
    tok = create_token(
        str(admin.id), audience=AUDIENCE_ADMIN, token_version=0, ttl_minutes=60
    )
    client.cookies.set(SESSION_COOKIE_ADMIN, tok)
    admin.token_version = 1
    db.flush()
    assert client.get(ME).status_code == 401


def test_logout_clears_cookie(client, admin):
    client.post(LOGIN, json=CREDS)
    assert client.get(ME).status_code == 200
    res = client.post("/api/v1/admin/auth/logout")
    assert res.status_code == 204
    client.cookies.clear()
    assert client.get(ME).status_code == 401


# ── same-origin (CSRF) guard ─────────────────────────────────────────────────

def test_state_change_requires_trusted_origin(admin_client, seeded_zones):
    lagos = next(z for z in seeded_zones if z.code == "lagos")
    res = admin_client.patch(
        f"/api/v1/admin/shipping-zones/{lagos.id}",
        json={"rate": 12345},
        headers={"origin": "https://evil.example"},
    )
    assert res.status_code == 403


def test_state_change_ok_with_trusted_origin(admin_client, seeded_zones):
    lagos = next(z for z in seeded_zones if z.code == "lagos")
    res = admin_client.patch(
        f"/api/v1/admin/shipping-zones/{lagos.id}", json={"rate": 12345}
    )  # client default origin is the trusted one
    assert res.status_code == 200


# ── password change bumps token_version ──────────────────────────────────────

def test_password_change_invalidates_other_sessions(client, admin):
    client.post(LOGIN, json=CREDS)
    # a second "device"
    other_token = create_token(
        str(admin.id), audience=AUDIENCE_ADMIN, token_version=0, ttl_minutes=60
    )
    res = client.post(
        "/api/v1/admin/auth/password",
        json={"current_password": "test-password", "new_password": "brand-new-pass"},
    )
    assert res.status_code == 200
    # this session stays alive (cookie was re-issued)
    assert client.get(ME).status_code == 200
    # the other device is dead
    client.cookies.set(SESSION_COOKIE_ADMIN, other_token)
    assert client.get(ME).status_code == 401


def test_password_change_wrong_current(client, admin):
    client.post(LOGIN, json=CREDS)
    res = client.post(
        "/api/v1/admin/auth/password",
        json={"current_password": "nope", "new_password": "brand-new-pass"},
    )
    assert res.status_code == 401


# ── rate limiting ────────────────────────────────────────────────────────────

def test_login_rate_limited(client, admin):
    codes = [client.post(LOGIN, json={**CREDS, "password": "x"}).status_code
             for _ in range(7)]
    assert 429 in codes
    assert codes.count(401) == 5  # first 5 pass the limiter, then 429


# ── production startup guard ─────────────────────────────────────────────────

def test_production_config_errors_flags_default_secret(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "change-me-in-production")
    errors = settings.production_config_errors()
    assert any("SECRET_KEY" in e for e in errors)


def test_production_config_errors_flags_localhost_cors(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "x" * 40)
    monkeypatch.setattr(settings, "cors_origins", ["http://localhost:3000"])
    errors = settings.production_config_errors()
    assert any("CORS_ORIGINS" in e for e in errors)


def test_dev_config_has_no_errors():
    assert settings.production_config_errors() == []


def test_email_sender_is_testing_detects_resend_dev(monkeypatch):
    monkeypatch.setattr(settings, "resend_from", "Nankara <onboarding@resend.dev>")
    assert settings.email_sender_is_testing is True
    monkeypatch.setattr(settings, "resend_from", "Nankara <no-reply@nankara.com>")
    assert settings.email_sender_is_testing is False
