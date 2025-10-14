"""
Populate categories, themes, and regions tables with data.

Revision ID: 5a8ffc1a3979
Revises: 1ac59f76c6dd
Create Date: 2025-10-12 22:07:59.005675
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "5a8ffc1a3979"
down_revision: Union[str, Sequence[str], None] = "1ac59f76c6dd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# --- Определение таблиц для вставки данных ---
categories_table = sa.table(
    "Categories", sa.column("id", sa.Integer), sa.column("name", sa.String)
)

themes_table = sa.table(
    "Themes", sa.column("name", sa.String), sa.column("category_id", sa.Integer)
)

regions_table = sa.table("Regions", sa.column("name", sa.String))

# --- Структуры для наполнения таблиц ---
CATEGORIES_DATA = [
    {"id": 1, "name": "IT-сфера"},
    {"id": 2, "name": "Авто"},
    {"id": 3, "name": "Аренда"},
    {"id": 4, "name": "Дом"},
    {"id": 5, "name": "Животные"},
    {"id": 6, "name": "Здоровье"},
    {"id": 7, "name": "Информационные услуги"},
    {"id": 8, "name": "Красота"},
    {"id": 9, "name": "Обучение"},
    {"id": 10, "name": "Общественное питание"},
    {"id": 11, "name": "Одежда"},
    {"id": 12, "name": "Природа"},
    {"id": 13, "name": "Искусство и развлечения"},
    {"id": 14, "name": "Ремонт"},
    {"id": 15, "name": "Сделай сам"},
    {"id": 16, "name": "Спорт"},
    {"id": 17, "name": "Финансы"},
    {"id": 18, "name": "Фото, видео"},
    {"id": 19, "name": "Юристы"},
]

THEMES_DATA = [
    {"name": "Администрирование", "category_id": 1},
    {"name": "Анализ и обработка данных", "category_id": 1},
    {"name": "Вебмастер", "category_id": 1},
    {"name": "Верстка и дизайн", "category_id": 1},
    {"name": "Компьютерный мастер", "category_id": 1},
    {"name": "Программист", "category_id": 1},
    {"name": "Техническая поддержка", "category_id": 1},
    {"name": "Автомойка", "category_id": 2},
    {"name": "Автосервис", "category_id": 2},
    {"name": "Автоэвакуация и буксировка", "category_id": 2},
    {"name": "Водитель", "category_id": 2},
    {"name": "Перевозка грузов", "category_id": 2},
    {"name": "Перевозка пассажиров", "category_id": 2},
    {"name": "Аренда квартир", "category_id": 3},
    {"name": "Аренда машин", "category_id": 3},
    {"name": "Предоставлений лицензий", "category_id": 3},
    {"name": "Прокат", "category_id": 3},
    {"name": "Услуги по временному проживанию", "category_id": 3},
    {"name": "Услуги по хранению", "category_id": 3},
    {"name": "Бытовые услуги", "category_id": 4},
    {"name": "Ведение хозяйства", "category_id": 4},
    {"name": "Гувернантка", "category_id": 4},
    {"name": "Доставка", "category_id": 4},
    {"name": "Няня\\Сиделка", "category_id": 4},
    {"name": "Повар", "category_id": 4},
    {"name": "Социальная помощь", "category_id": 4},
    {"name": "Уборка и клининг", "category_id": 4},
    {"name": "Химчистка", "category_id": 4},
    {"name": "Вакцинация животных", "category_id": 5},
    {"name": "Груминг", "category_id": 5},
    {"name": "Дрессировщик", "category_id": 5},
    {"name": "Кинология", "category_id": 5},
    {"name": "Передержка животных", "category_id": 5},
    {"name": "Уход за животными", "category_id": 5},
    {"name": "Диетолог", "category_id": 6},
    {"name": "Консультирование", "category_id": 6},
    {"name": "Логопед", "category_id": 6},
    {"name": "Массажист", "category_id": 6},
    {"name": "Психолог", "category_id": 6},
    {"name": "Тренер\\инструктор", "category_id": 6},
    {"name": "Исследования", "category_id": 7},
    {"name": "Маркетинг и реклама", "category_id": 7},
    {"name": "Обрядовые услуги", "category_id": 7},
    {"name": "Переводчик", "category_id": 7},
    {"name": "Копирайтер", "category_id": 7},
    {"name": "Писатель", "category_id": 7},
    {"name": "Консультирование", "category_id": 8},
    {"name": "Косметология", "category_id": 8},
    {"name": "Маникюр, педикюр", "category_id": 8},
    {"name": "Модельное направление", "category_id": 8},
    {"name": "Парикмахер", "category_id": 8},
    {"name": "Стилист", "category_id": 8},
    {"name": "Тату и пирсинг", "category_id": 8},
    {"name": "Эпиляция", "category_id": 8},
    {"name": "Репетитор", "category_id": 9},
    {"name": "Тренер", "category_id": 9},
    {"name": "Учитель", "category_id": 9},
    {"name": "Кондитер", "category_id": 10},
    {"name": "Обслуживание", "category_id": 10},
    {"name": "Повар", "category_id": 10},
    {"name": "Модельер, дизайнер", "category_id": 11},
    {"name": "Пошив, работа с тканями.", "category_id": 11},
    {"name": "Благоустройство территории", "category_id": 12},
    {"name": "Ландшафтный дизайн", "category_id": 12},
    {"name": "Животноводство", "category_id": 12},
    {"name": "Охота и рыболовство", "category_id": 12},
    {"name": "Переработка отходов", "category_id": 12},
    {"name": "Сельхоз услуги", "category_id": 12},
    {"name": "Аниматор", "category_id": 13},
    {"name": "Артист, актер", "category_id": 13},
    {"name": "Ведущий, тамада", "category_id": 13},
    {"name": "Музыкант", "category_id": 13},
    {"name": "Экскурсовод", "category_id": 13},
    {"name": "Дизайн интерьера", "category_id": 14},
    {"name": "Бытовой ремонт", "category_id": 14},
    {"name": "Отделка квартир", "category_id": 14},
    {"name": "Реставрация", "category_id": 14},
    {"name": "Строительство", "category_id": 14},
    {"name": "Кузнечное дело", "category_id": 15},
    {"name": "Металлообработка", "category_id": 15},
    {"name": "Проектирование", "category_id": 15},
    {"name": "Услуги по сборке", "category_id": 15},
    {"name": "Консультирование", "category_id": 16},
    {"name": "Тренер, инструктор", "category_id": 16},
    {"name": "Бухгалтерия", "category_id": 17},
    {"name": "Консультирование", "category_id": 17},
    {"name": "Страховые услуги", "category_id": 17},
    {"name": "Финансовые услуги", "category_id": 17},
    {"name": "Фотоателье", "category_id": 18},
    {"name": "Издательские услуги", "category_id": 18},
    {"name": "Фотограф", "category_id": 18},
    {"name": "Художник", "category_id": 18},
    {"name": "Консультирование", "category_id": 19},
    {"name": "Юридические услуги", "category_id": 19},
]

REGIONS_DATA = [
    {"name": "Москва"},
    {"name": "Санкт-Петербург"},
    {"name": "Севастополь"},
    {"name": "Амурская область"},
    {"name": "Архангельская область"},
    {"name": "Астраханская область"},
    {"name": "Белгородская область"},
    {"name": "Брянская область"},
    {"name": "Владимирская область"},
    {"name": "Волгоградская область"},
    {"name": "Вологодская область"},
    {"name": "Воронежская область"},
    {"name": "Донецкая народная республика"},
    {"name": "Ивановская область"},
    {"name": "Иркутская область"},
    {"name": "Калининградская область"},
    {"name": "Калужская область"},
    {"name": "Кемеровская область"},
    {"name": "Кировская область"},
    {"name": "Костромская область"},
    {"name": "Курганская область"},
    {"name": "Курская область"},
    {"name": "Ленинградская область"},
    {"name": "Липецкая область"},
    {"name": "Луганская народная республика"},
    {"name": "Магаданская область"},
    {"name": "Московская область"},
    {"name": "Мурманская область"},
    {"name": "Нижегородская область"},
    {"name": "Новгородская область"},
    {"name": "Новосибирская область"},
    {"name": "Омская область"},
    {"name": "Оренбургская область"},
    {"name": "Орловская область"},
    {"name": "Пензенская область"},
    {"name": "Псковская область"},
    {"name": "Ростовская область"},
    {"name": "Рязанская область"},
    {"name": "Самарская область"},
    {"name": "Саратовская область"},
    {"name": "Сахалинская область"},
    {"name": "Свердловская область"},
    {"name": "Смоленская область"},
    {"name": "Тамбовская область"},
    {"name": "Тверская область"},
    {"name": "Томская область"},
    {"name": "Тульская область"},
    {"name": "Тюменская область"},
    {"name": "Ульяновская область"},
    {"name": "Челябинская область"},
    {"name": "Ярославская область"},
]


def upgrade() -> None:
    # Очищаем таблицы перед вставкой, чтобы избежать дубликатов
    op.execute("SET FOREIGN_KEY_CHECKS = 0;")
    op.execute("TRUNCATE TABLE `Themes`;")
    op.execute("TRUNCATE TABLE `Categories`;")
    op.execute("TRUNCATE TABLE `Regions`;")
    op.execute("SET FOREIGN_KEY_CHECKS = 1;")

    # Наполняем таблицы данными
    op.bulk_insert(categories_table, CATEGORIES_DATA)
    op.bulk_insert(themes_table, THEMES_DATA)
    op.bulk_insert(regions_table, REGIONS_DATA)


def downgrade() -> None:
    # Откат удаляет все данные из этих таблиц
    op.execute("SET FOREIGN_KEY_CHECKS = 0;")
    op.execute("TRUNCATE TABLE `Themes`;")
    op.execute("TRUNCATE TABLE `Categories`;")
    op.execute("TRUNCATE TABLE `Regions`;")
    op.execute("SET FOREIGN_KEY_CHECKS = 1;")
