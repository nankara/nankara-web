from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.ratelimit import limiter
from app.inbox import emails, service
from app.inbox.schemas import ConsultationIn, ContactIn, NewsletterIn, SubmitAck

router = APIRouter()

_ACK = SubmitAck()


@router.post("/contact", response_model=SubmitAck, status_code=201)
@limiter.limit("5/minute")
def submit_contact(
    request: Request, payload: ContactIn, db: Session = Depends(get_db)
) -> SubmitAck:
    if payload.website:  # honeypot — pretend it worked
        return _ACK
    message = service.create_contact(db, payload)
    emails.notify_admin(db, message)
    return _ACK


@router.post("/consultation", response_model=SubmitAck, status_code=201)
@limiter.limit("5/minute")
def submit_consultation(
    request: Request, payload: ConsultationIn, db: Session = Depends(get_db)
) -> SubmitAck:
    if payload.website:
        return _ACK
    message = service.create_consultation(db, payload)
    emails.notify_admin(db, message)
    return _ACK


@router.post("/newsletter", response_model=SubmitAck, status_code=201)
@limiter.limit("5/minute")
def subscribe_newsletter(
    request: Request, payload: NewsletterIn, db: Session = Depends(get_db)
) -> SubmitAck:
    if payload.website:
        return _ACK
    service.subscribe(db, payload)
    return _ACK
