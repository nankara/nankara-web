from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.core.csrf import require_trusted_origin
from app.core.database import get_db
from app.inbox import service
from app.inbox.schemas import (
    HandledIn,
    InboxMessageListItem,
    InboxMessageOut,
    NewsletterListOut,
)
from app.models import InboxMessage, NewsletterSubscriber

router = APIRouter(
    dependencies=[Depends(get_current_admin), Depends(require_trusted_origin)]
)


@router.get("/inbox", response_model=list[InboxMessageListItem])
def list_messages(
    db: Session = Depends(get_db),
    kind: str | None = Query(default=None),
    handled: bool | None = Query(default=None),
) -> list[InboxMessage]:
    stmt = select(InboxMessage).order_by(InboxMessage.id.desc())
    if kind:
        stmt = stmt.where(InboxMessage.kind == kind)
    if handled is not None:
        stmt = stmt.where(InboxMessage.is_handled.is_(handled))
    return list(db.scalars(stmt))


@router.get("/inbox/{message_id}", response_model=InboxMessageOut)
def get_message(message_id: int, db: Session = Depends(get_db)) -> InboxMessage:
    message = db.get(InboxMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.patch("/inbox/{message_id}", response_model=InboxMessageOut)
def update_message(
    message_id: int, payload: HandledIn, db: Session = Depends(get_db)
) -> InboxMessage:
    message = db.get(InboxMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return service.mark_handled(db, message, payload.is_handled)


@router.get("/newsletter", response_model=NewsletterListOut)
def list_subscribers(db: Session = Depends(get_db)) -> NewsletterListOut:
    subscribers = list(
        db.scalars(
            select(NewsletterSubscriber)
            .where(NewsletterSubscriber.is_active.is_(True))
            .order_by(NewsletterSubscriber.id.desc())
        )
    )
    count = db.scalar(
        select(func.count())
        .select_from(NewsletterSubscriber)
        .where(NewsletterSubscriber.is_active.is_(True))
    )
    return NewsletterListOut(count=count or 0, subscribers=subscribers)
