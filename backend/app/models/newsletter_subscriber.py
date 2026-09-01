from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class NewsletterSubscriber(Base, TimestampMixin):
    """An email captured by the storefront newsletter form. Export to a real
    provider later; for now the admin can view and download the list.
    """

    __tablename__ = "newsletter_subscribers"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    source: Mapped[str] = mapped_column(
        String(40), default="footer", server_default="footer", nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
