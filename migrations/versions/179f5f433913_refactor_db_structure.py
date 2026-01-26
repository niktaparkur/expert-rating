"""Refactor_DB_Structure

Revision ID: 179f5f433913
Revises:
Create Date: 2026-01-14 16:44:04.530769

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = "179f5f433913"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    # 1. ОТКЛЮЧАЕМ ПРОВЕРКУ FK (чтобы удалять таблицы в любом порядке)
    op.execute("SET FOREIGN_KEY_CHECKS = 0")

    # 2. УДАЛЯЕМ СТАРЫЕ ТАБЛИЦЫ (если они существуют)
    # Используем IF EXISTS для безопасности
    tables_to_drop = [
        "Votes",
        "PromoCodeActivations",
        "PromoCodes",
        "Mailings",
        "ExpertUpdateRequests",
        "ExpertSelectedThemes",
        "Events",
        "ExpertProfiles",
        # Справочники тоже пересоздаем для чистоты
        "Themes",
        "Categories",
        # 'Regions' # Если хотите сохранить регионы, закомментируйте
    ]

    for table in tables_to_drop:
        op.execute(f"DROP TABLE IF EXISTS `{table}`")

    # 3. ТАБЛИЦА USERS (Особый случай)
    # Если таблицы 'Users' (старой) нет, но есть 'users' (новой, lowercase) - ничего не делаем.
    # Если есть 'Users' (старая) - переименовываем в 'users' и приводим к схеме.
    # Если нет вообще никакой - создаем.

    if "Users" in tables:
        op.rename_table("Users", "users")

    # Теперь проверяем существование 'users' (после переименования или изначально)
    if "users" not in tables and "Users" not in tables:  # Если таблицы не было вообще
        op.create_table(
            "users",
            sa.Column("vk_id", sa.BigInteger(), autoincrement=False, nullable=False),
            sa.Column("first_name", sa.String(length=255), nullable=True),
            sa.Column("last_name", sa.String(length=255), nullable=True),
            sa.Column("photo_url", sa.Text(), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column(
                "registration_date",
                sa.TIMESTAMP(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("is_expert", sa.Boolean(), nullable=True),
            sa.Column("is_admin", sa.Boolean(), nullable=True),
            sa.Column(
                "allow_notifications", sa.Boolean(), server_default="0", nullable=True
            ),
            sa.Column(
                "allow_expert_mailings", sa.Boolean(), server_default="1", nullable=True
            ),
            sa.PrimaryKeyConstraint("vk_id"),
            sa.UniqueConstraint("email"),
        )

    # ВКЛЮЧАЕМ ПРОВЕРКУ FK ОБРАТНО
    op.execute("SET FOREIGN_KEY_CHECKS = 1")

    # 4. СОЗДАНИЕ НОВЫХ ТАБЛИЦ
    # Справочники
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "regions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "themes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Финансы
    op.create_table(
        "promo_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_promo_codes_code"), "promo_codes", ["code"], unique=True)

    op.create_table(
        "donut_subscriptions",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("next_payment_date", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "last_updated",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.vk_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # Эксперт (Создаем с нуля, так как удалили старую из-за смены схемы)
    op.create_table(
        "expert_profiles",
        sa.Column("user_vk_id", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.Enum("pending", "approved", "rejected"), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("region", sa.String(length=255), nullable=True),
        sa.Column("social_link", sa.Text(), nullable=True),
        sa.Column("regalia", sa.Text(), nullable=True),
        sa.Column("performance_link", sa.Text(), nullable=True),
        sa.Column("referrer_info", sa.Text(), nullable=True),
        sa.Column(
            "show_community_rating", sa.Boolean(), server_default="1", nullable=True
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_vk_id"], ["users.vk_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_vk_id"),
    )

    op.create_table(
        "expert_themes",
        sa.Column("expert_vk_id", sa.BigInteger(), nullable=False),
        sa.Column("theme_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["expert_vk_id"], ["expert_profiles.user_vk_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["theme_id"], ["themes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("expert_vk_id", "theme_id"),
    )

    op.create_table(
        "expert_update_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("expert_vk_id", sa.BigInteger(), nullable=True),
        sa.Column("new_data", sa.JSON(), nullable=False),
        sa.Column("status", sa.Enum("pending", "approved", "rejected"), nullable=True),
        sa.Column("admin_comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["expert_vk_id"], ["expert_profiles.user_vk_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Ивенты
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("expert_id", sa.BigInteger(), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("promo_word", sa.String(length=100), nullable=True),
        sa.Column("event_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("status", sa.Enum("pending", "approved", "rejected"), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("is_private", sa.Boolean(), nullable=True),
        sa.Column("event_link", sa.Text(), nullable=True),
        sa.Column("voter_thank_you_message", sa.Text(), nullable=True),
        sa.Column("send_reminder", sa.Boolean(), server_default="0", nullable=True),
        sa.Column("reminder_sent", sa.Boolean(), server_default="0", nullable=True),
        sa.Column("wall_post_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["expert_id"], ["expert_profiles.user_vk_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Социальное (Рейтинги)
    op.create_table(
        "expert_ratings",
        sa.Column("expert_id", sa.BigInteger(), nullable=False),
        sa.Column("voter_id", sa.BigInteger(), nullable=False),
        sa.Column("vote_value", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["expert_id"], ["expert_profiles.user_vk_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["voter_id"], ["users.vk_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("expert_id", "voter_id"),
    )

    op.create_table(
        "event_feedbacks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("expert_id", sa.BigInteger(), nullable=True),
        sa.Column("voter_id", sa.BigInteger(), nullable=True),
        sa.Column("event_id", sa.Integer(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("rating_snapshot", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["expert_id"], ["expert_profiles.user_vk_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["voter_id"], ["users.vk_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("SET FOREIGN_KEY_CHECKS = 0")

    op.drop_table("event_feedbacks")
    op.drop_table("expert_update_requests")
    op.drop_table("expert_themes")
    op.drop_table("expert_ratings")
    op.drop_table("events")
    op.drop_table("themes")
    op.drop_table("expert_profiles")
    op.drop_table("donut_subscriptions")
    op.drop_table("users")  # Внимание: даунгрейд удалит пользователей!
    op.drop_table("regions")
    op.drop_index(op.f("ix_promo_codes_code"), table_name="promo_codes")
    op.drop_table("promo_codes")
    op.drop_table("categories")

    op.execute("SET FOREIGN_KEY_CHECKS = 1")
