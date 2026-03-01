from datetime import timedelta, timezone
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from loguru import logger

from src.models import Event, EventFeedback, ExpertProfile


async def generate_event_excel_report(db: AsyncSession, event_id: int) -> str | None:
    logger.info(f"Starting Excel report generation for event_id: {event_id}")

    event_query = (
        select(Event)
        .options(selectinload(Event.expert).selectinload(ExpertProfile.user))
        .where(Event.id == event_id)
    )

    event_res = await db.execute(event_query)
    event = event_res.scalars().first()

    if not event:
        logger.warning(f"Event {event_id} not found.")
        return None

    # 2. Получаем отзывы
    feedbacks_query = (
        select(EventFeedback)
        .where(EventFeedback.event_id == event_id)
        .order_by(EventFeedback.created_at.desc())
    )
    feedbacks_res = await db.execute(feedbacks_query)
    feedbacks = feedbacks_res.scalars().all()

    # 3. Расчет времени
    msk_tz = timezone(timedelta(hours=3))
    start_dt = event.event_date.astimezone(msk_tz)
    end_dt = start_dt + timedelta(minutes=event.duration_minutes)

    date_str = f"{start_dt.strftime('%d.%m.%Y %H:%M')} — {end_dt.strftime('%H:%M')}"

    # 4. Создаем Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "Отчет по мероприятию"

    # --- ШАПКА МЕРОПРИЯТИЯ ---
    ws["A1"] = "Название мероприятия:"
    ws["B1"] = event.name
    ws["A1"].font = Font(bold=True)

    ws["A2"] = "Промо-слово:"
    ws["B2"] = event.promo_word
    ws["A2"].font = Font(bold=True)

    ws["A3"] = "Дата проведения:"
    ws["B3"] = date_str
    ws["A3"].font = Font(bold=True)

    ws["A4"] = "Всего голосов:"
    ws["B4"] = len(feedbacks)
    ws["A4"].font = Font(bold=True)

    # Отступ
    ws.append([])

    # --- ТАБЛИЦА ГОЛОСОВ ---
    headers = ["Дата и время", "VK ID Слушателя", "Голос", "Комментарий"]
    ws.append(headers)

    # Стилизация заголовка таблицы
    header_fill = PatternFill(
        start_color="4A76A8", end_color="4A76A8", fill_type="solid"
    )
    header_font = Font(color="FFFFFF", bold=True)

    for col_num, cell in enumerate(ws[6], 1):  # 6-я строка - заголовки
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # Заполнение данными
    for fb in feedbacks:
        vote_text = "Нейтрально"
        if fb.rating_snapshot == 1:
            vote_text = "Доверяю (+1)"
        elif fb.rating_snapshot == -1:
            vote_text = "Не доверяю (-1)"

        vote_dt = (
            fb.created_at.astimezone(msk_tz).strftime("%d.%m.%Y %H:%M:%S")
            if fb.created_at
            else "-"
        )
        comment = fb.comment or ""
        voter_link = f"https://vk.com/id{fb.voter_id}"

        ws.append([vote_dt, voter_link, vote_text, comment])

    # Настройка ширины колонок
    ws.column_dimensions["A"].width = 25
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 20
    ws.column_dimensions["D"].width = 50

    # Сохранение файла
    filename = f"report_event_{event.promo_word}_{event_id}.xlsx"
    file_path = f"/tmp/{filename}"
    wb.save(file_path)

    logger.success(f"Excel report saved to {file_path}")
    return file_path
