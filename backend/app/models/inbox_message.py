from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class InboxMessage(Base, TimestampMixin):
    """A submission from a public brand-page form (spec §11 — outside the shop).

    One table for both form types; `kind` selects the shape:

    - ``contact``      → name, email, subject, message
    - ``consultation`` → name, email, phone (WhatsApp), country, message (goal)
    """

    __tablename__ = "inbox_messages"
    __table_args__ = (Index("ix_inbox_messages_handled_id", "is_handled", "id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(
        String(40), default="", server_default="", nullable=False
    )
    subject: Mapped[str] = mapped_column(
        String(160), default="", server_default="", nullable=False
    )
    country: Mapped[str] = mapped_column(
        String(120), default="", server_default="", nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_handled: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    handled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
