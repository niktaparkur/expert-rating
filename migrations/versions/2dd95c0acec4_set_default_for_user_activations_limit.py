"""set_default_for_user_activations_limit

Revision ID: 2dd95c0acec4
Revises: cddaf70eb417
Create Date: 2025-10-21 19:43:07.560122

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2dd95c0acec4'
down_revision: Union[str, Sequence[str], None] = 'cddaf70eb417'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('PromoCodes', 'user_activations_limit',
                existing_type=sa.INTEGER(),
                nullable=False,
                server_default=sa.text('1'))


def downgrade() -> None:
    op.alter_column('PromoCodes', 'user_activations_limit',
                existing_type=sa.INTEGER(),
                nullable=True,
                server_default=None)