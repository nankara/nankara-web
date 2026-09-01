from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    environment: str = "development"

    database_url: str = (
        "postgresql+psycopg://nankara:nankara@localhost:5433/nankara"
    )

    secret_key: str = "change-me-in-production"
    # Session-cookie lifetimes (minutes). Admin sessions are short; customer
    # sessions are long ("stay signed in").
    admin_token_ttl_minutes: int = 720  # 12h
    customer_token_ttl_minutes: int = 43200  # 30d
    # Legacy alias — kept so nothing that still imports it breaks.
    access_token_expire_minutes: int = 480

    # NoDecode: keep pydantic-settings from JSON-parsing the raw env value so the
    # validator below can accept a plain comma-separated string.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_upload_folder: str = "nankara/products"

    # Paystack — the only MVP payment gateway (spec §13). Secret key stays
    # server-side; the browser never sees it.
    paystack_secret_key: str | None = None
    paystack_public_key: str | None = None  # kept for symmetry / a future inline flow
    paystack_base_url: str = "https://api.paystack.co"
    # Used to build the Paystack callback_url the customer returns to, and the
    # links in account emails.
    frontend_origin: str = "http://localhost:3000"

    # Set when the API is on a sibling subdomain of the frontend (e.g.
    # `api.nankara.com` + `www.nankara.com`) so session cookies are sent to both:
    # COOKIE_DOMAIN=.nankara.com. Leave blank when the frontend proxies /api/v1/*
    # (same-origin) — the local dev and default Vercel setups.
    cookie_domain: str | None = None

    # Resend — transactional email (email verification, password reset). Optional;
    # when unset those flows still succeed and just don't send.
    resend_api_key: str | None = None
    resend_from: str = "Nankara <onboarding@resend.dev>"

    # Minimum SECRET_KEY length enforced in production (see startup guard).
    secret_key_min_length: int = 32

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def cloudinary_configured(self) -> bool:
        return all(
            (
                self.cloudinary_cloud_name,
                self.cloudinary_api_key,
                self.cloudinary_api_secret,
            )
        )

    @property
    def paystack_configured(self) -> bool:
        return bool(self.paystack_secret_key)

    @property
    def email_configured(self) -> bool:
        return bool(self.resend_api_key)

    @property
    def email_sender_is_testing(self) -> bool:
        """`RESEND_FROM` still points at Resend's shared testing address, which
        only delivers to the Resend account owner (any other recipient 403s)."""
        return "resend.dev" in self.resend_from.lower()

    def production_config_errors(self) -> list[str]:
        """Fatal misconfigurations to refuse to start on in production."""
        if not self.is_production:
            return []
        errors: list[str] = []
        if (
            self.secret_key == "change-me-in-production"
            or len(self.secret_key) < self.secret_key_min_length
        ):
            errors.append(
                f"SECRET_KEY must be a random string of at least "
                f"{self.secret_key_min_length} characters in production."
            )
        local = ("localhost", "127.0.0.1")
        if any(any(h in origin for h in local) for origin in self.cors_origins):
            errors.append(
                "CORS_ORIGINS must be the real frontend origin(s) in production, "
                "not localhost."
            )
        return errors


settings = Settings()
