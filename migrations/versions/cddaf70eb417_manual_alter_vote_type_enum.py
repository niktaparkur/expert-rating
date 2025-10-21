"""manual_alter_vote_type_enum

Revision ID: cddaf70eb417
Revises: 8cd7172669ff
Create Date: 2025-10-21 18:26:19.174894

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision: str = "cddaf70eb417"
down_revision: Union[str, Sequence[str], None] = "8cd7172669ff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "Votes",
        "vote_type",
        existing_type=mysql.ENUM("trust", "distrust"),
        type_=mysql.ENUM("trust", "distrust", "neutral"),
        existing_nullable=True,
    )
    pass


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "Votes",
        "vote_type",
        existing_type=mysql.ENUM("trust", "distrust", "neutral"),
        type_=mysql.ENUM("trust", "distrust"),
        existing_nullable=True,
    )
    pass
