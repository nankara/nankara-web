from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.inbox.schemas import ConsultationIn, ContactIn, NewsletterIn
from app.models import Admin, InboxMessage, NewsletterSubscriber


def create_contact(db: Session, payload: ContactIn) -> InboxMessage:
    message = InboxMessage(
        kind="contact",
        name=payload.name,
        email=str(payload.email),
        subject=payload.subject,
        message=payload.message,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def create_consultation(db: Session, payload: ConsultationIn) -> InboxMessage:
    message = InboxMessage(
        kind="consultation",
        name=payload.name,
        email=str(payload.email),
        phone=payload.whatsapp,
        country=payload.country,
        subject="Consultation request",
        message=payload.goal,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def subscribe(db: Session, payload: NewsletterIn) -> tuple[NewsletterSubscriber, bool]:
    email = str(payload.email).strip().lower()
    existing = db.scalar(
        select(NewsletterSubscriber).where(
            func.lower(NewsletterSubscriber.email) == email
        )
    )
    if existing is not None:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
        return existing, False
    subscriber = NewsletterSubscriber(email=email, source=payload.source or "footer")
    db.add(subscriber)
    db.commit()
    db.refresh(subscriber)
    return subscriber, True


def mark_handled(
    db: Session, message: InboxMessage, is_handled: bool
) -> InboxMessage:
    message.is_handled = is_handled
    message.handled_at = datetime.now(timezone.utc) if is_handled else None
    db.commit()
    db.refresh(message)
    return message


def admin_notification_email(db: Session) -> str | None:
    """Where form notifications go — the oldest active admin's address.

    Deliberately the DB admin (= the Resend account owner in this deployment), so
    notifications land even before a Resend sending domain is verified.
    """
    return db.scalar(
        select(Admin.email)
        .where(Admin.is_active.is_(True))
        .order_by(Admin.id)
        .limit(1)
    )
