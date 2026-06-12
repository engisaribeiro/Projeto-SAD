from __future__ import annotations

import csv
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas.marcos import DecisionResponse


def build_ranking_csv(result: DecisionResponse) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Posição", "Fornecedor", "S_i", "K_i-", "K_i+", "f(K_i)"])
    for score in result.scores:
        writer.writerow([score.rank, score.supplier_name, score.s_i, score.k_i_minus, score.k_i_plus, score.f_k_i])
    return output.getvalue()


def build_ranking_pdf(run_name: str, result: DecisionResponse) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"Relatório {run_name}")
    styles = getSampleStyleSheet()
    body = ParagraphStyle("Body", parent=styles["BodyText"], leading=16, spaceAfter=8)
    story = [
        Paragraph("Selo Verde Saladorama", styles["Title"]),
        Paragraph(f"Relatório da rodada: {run_name}", styles["Heading2"]),
        Paragraph(datetime.utcnow().strftime("Gerado em %d/%m/%Y %H:%M UTC"), body),
        Spacer(1, 8),
        Paragraph(result.insights.summary, body),
        Spacer(1, 10),
    ]

    table_data = [["Posição", "Fornecedor", "S_i", "K_i-", "K_i+", "f(K_i)"]]
    for score in result.scores:
        table_data.append([
            str(score.rank),
            score.supplier_name,
            f"{score.s_i:.6f}",
            f"{score.k_i_minus:.6f}",
            f"{score.k_i_plus:.6f}",
            f"{score.f_k_i:.6f}",
        ])

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14532d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("PADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(table)
    story.append(Spacer(1, 12))
    story.append(Paragraph("Critérios cruciais para a decisão", styles["Heading3"]))
    for item in result.insights.decisive_criteria:
        story.append(Paragraph(f"• {item.criterion_name}: {item.explanation}", body))

    doc.build(story)
    return buffer.getvalue()
