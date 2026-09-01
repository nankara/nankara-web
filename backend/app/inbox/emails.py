import logging

from sqlalchemy.orm import Session

from app.inbox.service import admin_notification_email
from app.models import InboxMessage
from app.notifications import templates
from app.notifications.resend_client import send_email

logger = logging.getLogger(__name__)


def notify_admin(db: Session, message: InboxMessage) -> None:
    """Email the admin about a new contact / consultation submission. Best-effort."""
    to = admin_notification_email(db)
    if not to:
        logger.warning(
            "No active admin — inbox message %s not notified by email", message.id
        )
        return
    subject, html = templates.new_inbox_message(
        kind=message.kind,
        name=message.name,
        email=message.email,
        message=message.message,
        subject=message.subject,
        phone=message.phone,
        country=message.country,
    )
    send_email(to=to, subject=subject, html=html)
