"""brand-page forms: inbox_messages + newsletter_subscribers

Revision ID: 0006_inbox
Revises: 0005_users
Create Date: 2026-09-01

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0006_inbox"
down_revision: Union[str, None] = "0005_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "inbox_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=40), server_default="", nullable=False),
        sa.Column("subject", sa.String(length=160), server_default="", nullable=False),
        sa.Column("country", sa.String(length=120), server_default="", nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "is_handled", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
        sa.Column("handled_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
    )
    op.create_index(
        "ix_inbox_messages_handled_id", "inbox_messages", ["is_handled", "id"]
    )

    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "source", sa.String(length=40), server_default="footer", nullable=False
        ),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        *_timestamps(),
    )
    op.create_index(
        "ix_newsletter_subscribers_email",
        "newsletter_subscribers",
        ["email"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_newsletter_subscribers_email", table_name="newsletter_subscribers"
    )
    op.drop_table("newsletter_subscribers")
    op.drop_index("ix_inbox_messages_handled_id", table_name="inbox_messages")
    op.drop_table("inbox_messages")
