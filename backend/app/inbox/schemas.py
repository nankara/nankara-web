from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _strip(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


class _HoneypotIn(BaseModel):
    # Bots fill hidden fields; real users never see this one. A non-empty value
    # means "silently accept and drop".
    website: str = ""


class ContactIn(_HoneypotIn):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=4000)

    _s = field_validator("name", "subject", "message", mode="before")(_strip)


class ConsultationIn(_HoneypotIn):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    country: str = Field(min_length=1, max_length=120)
    whatsapp: str = Field(min_length=3, max_length=40)
    goal: str = Field(min_length=1, max_length=4000)

    _s = field_validator("name", "country", "whatsapp", "goal", mode="before")(_strip)


class NewsletterIn(_HoneypotIn):
    email: EmailStr
    source: str = Field(default="footer", max_length=40)


class SubmitAck(BaseModel):
    status: str = "received"


# ── Admin ────────────────────────────────────────────────────────────────────

class InboxMessageListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    name: str
    email: EmailStr
    subject: str
    is_handled: bool
    created_at: datetime


class InboxMessageOut(InboxMessageListItem):
    phone: str
    country: str
    message: str
    handled_at: datetime | None


class HandledIn(BaseModel):
    is_handled: bool


class NewsletterSubscriberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    source: str
    created_at: datetime


class NewsletterListOut(BaseModel):
    count: int
    subscribers: list[NewsletterSubscriberOut]
