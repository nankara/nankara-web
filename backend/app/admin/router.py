from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.core.csrf import require_trusted_origin
from app.core.database import get_db
from app.models import (
    Availability,
    Category,
    InboxMessage,
    NewsletterSubscriber,
    Order,
    OrderStatus,
    Product,
)
from app.schemas.admin import OverviewOut

router = APIRouter(
    dependencies=[Depends(get_current_admin), Depends(require_trusted_origin)]
)


def _count_orders(db: Session, status: OrderStatus) -> int:
    return (
        db.scalar(
            select(func.count()).select_from(Order).where(Order.status == status)
        )
        or 0
    )


@router.get("/overview", response_model=OverviewOut)
def overview(db: Session = Depends(get_db)) -> OverviewOut:
    total_products = db.scalar(select(func.count()).select_from(Product)) or 0
    published = (
        db.scalar(
            select(func.count()).select_from(Product).where(Product.is_published.is_(True))
        )
        or 0
    )
    out_of_stock = (
        db.scalar(
            select(func.count())
            .select_from(Product)
            .where(Product.availability == Availability.OUT_OF_STOCK)
        )
        or 0
    )
    total_categories = db.scalar(select(func.count()).select_from(Category)) or 0
    unhandled_messages = (
        db.scalar(
            select(func.count())
            .select_from(InboxMessage)
            .where(InboxMessage.is_handled.is_(False))
        )
        or 0
    )
    newsletter_subscribers = (
        db.scalar(
            select(func.count())
            .select_from(NewsletterSubscriber)
            .where(NewsletterSubscriber.is_active.is_(True))
        )
        or 0
    )

    return OverviewOut(
        total_products=total_products,
        published_products=published,
        draft_products=total_products - published,
        out_of_stock_products=out_of_stock,
        total_categories=total_categories,
        pending_payment_orders=_count_orders(db, OrderStatus.PENDING_PAYMENT),
        paid_orders=_count_orders(db, OrderStatus.PAID),
        in_production_orders=_count_orders(db, OrderStatus.IN_PRODUCTION),
        awaiting_shipment_orders=_count_orders(db, OrderStatus.READY),
        unhandled_messages=unhandled_messages,
        newsletter_subscribers=newsletter_subscribers,
    )
