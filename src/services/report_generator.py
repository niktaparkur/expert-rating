import os
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from transliterate import translit
from loguru import logger

from src.models.all_models import ExpertProfile, Vote

# --- РЕГИСТРАЦИЯ ЛОКАЛЬНЫХ ШРИФТОВ ---
try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    FONT_DIR = os.path.join(BASE_DIR, "..", "assets", "fonts")

    REGULAR_FONT_PATH = os.path.join(FONT_DIR, "DejaVuSans.ttf")
    BOLD_FONT_PATH = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")

    pdfmetrics.registerFont(TTFont("DejaVuSans", REGULAR_FONT_PATH))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", BOLD_FONT_PATH))

    logger.info("Successfully registered 'DejaVuSans' and 'DejaVuSans-Bold' fonts.")
except Exception as e:
    logger.critical(
        f"Could not load font file(s) from {FONT_DIR}. PDF generation will fail. Error: {e}"
    )


async def generate_expert_report(db: AsyncSession, expert_id: int) -> str | None:
    logger.info(f"Starting PDF report generation for expert_id: {expert_id}")
    try:
        # 1. Получение данных эксперта
        expert_profile_result = await db.execute(
            select(ExpertProfile)
            .options(selectinload(ExpertProfile.user))
            .where(ExpertProfile.user_vk_id == expert_id)
        )
        expert_profile = expert_profile_result.scalars().first()

        if not expert_profile:
            logger.warning(
                f"Expert profile with user_vk_id {expert_id} not found. Aborting report generation."
            )
            return None
        logger.success(
            f"Expert profile for {expert_profile.user.first_name} {expert_profile.user.last_name} found."
        )

        # 2. Получение голосов
        votes_query = (
            select(Vote)
            .where(Vote.expert_vk_id == expert_id)
            .options(selectinload(Vote.event))
            .order_by(Vote.created_at.desc())
        )
        votes_result = await db.execute(votes_query)
        votes = votes_result.scalars().all()
        logger.info(f"Found {len(votes)} votes for this expert.")

        # 3. Формирование имени файла
        user = expert_profile.user
        last_name_translit = translit(user.last_name, "ru", reversed=True).replace(
            "'", ""
        )
        first_name_translit = translit(user.first_name, "ru", reversed=True).replace(
            "'", ""
        )
        date_str_file = datetime.now().strftime("%d-%m-%Y")

        filename = f"report_{user.vk_id}_{last_name_translit}_{first_name_translit}_{date_str_file}.pdf"
        file_path = f"/tmp/{filename}"
        logger.debug(f"Generated report filename: {file_path}")

        # 4. Создание и настройка PDF документа
        doc = SimpleDocTemplate(file_path, pagesize=A4)

        # styles = getSampleStyleSheet()
        StyleNormal = ParagraphStyle(
            name="Normal", fontName="DejaVuSans", fontSize=10, leading=12
        )
        StyleBold = ParagraphStyle(
            name="Bold", fontName="DejaVuSans-Bold", fontSize=10, leading=12
        )
        StyleTitle = ParagraphStyle(
            name="Title",
            fontName="DejaVuSans-Bold",
            fontSize=16,
            spaceAfter=12,
            alignment=1,
        )

        story = []
        expert_name = f"{user.first_name} {user.last_name}"
        title = Paragraph(
            f"Отчет по голосованию за эксперта: {expert_name}", StyleTitle
        )
        story.append(title)
        story.append(Spacer(1, 12))

        # 5. Наполнение таблицы данными
        table_data = [
            [
                Paragraph("Дата", StyleBold),
                Paragraph("Мероприятие/Тип", StyleBold),
                Paragraph("Голос", StyleBold),
                Paragraph("Комментарий", StyleBold),
            ]
        ]
        vote_type_map = {"trust": "Доверие", "distrust": "Недоверие"}

        for vote in votes:
            date_str_vote = vote.created_at.astimezone(timezone.utc).strftime(
                "%d.%m.%Y %H:%M"
            )
            source = (
                vote.event.event_name
                if vote.is_expert_vote and vote.event
                else "Народный голос"
            )
            vote_str = vote_type_map.get(vote.vote_type, "N/A")
            comment = (
                vote.comment_positive
                if vote.vote_type == "trust"
                else vote.comment_negative
            )
            comment = comment or ""

            table_data.append(
                [
                    Paragraph(date_str_vote, StyleNormal),
                    Paragraph(source, StyleNormal),
                    Paragraph(vote_str, StyleNormal),
                    Paragraph(comment, StyleNormal),
                ]
            )

        if not votes:
            story.append(Paragraph("По данному эксперту еще нет голосов.", StyleNormal))
        else:
            table = Table(table_data, colWidths=[90, 140, 70, 180])
            style = TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4A76A8")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("TOPPADDING", (0, 0), (-1, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F0F2F5")),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ]
            )
            table.setStyle(style)
            story.append(table)

        # 6. Сборка документа
        doc.build(story)
        logger.success(f"PDF report successfully built and saved to {file_path}")
        return file_path
    except Exception as e:
        logger.critical(
            f"CRITICAL ERROR during PDF generation for expert {expert_id}: {e}",
            exc_info=True,
        )
        return None
