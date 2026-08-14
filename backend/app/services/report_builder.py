import csv
import io

import httpx
from docx import Document
from openpyxl import Workbook
from pydantic import BaseModel
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import settings

DOMAIN_LABELS = {
    "membres": "Membres",
    "dons": "Dons",
    "evenements": "Événements et formations",
    "sermons": "Sermons",
    "articles": "Blog",
    "eglises": "Églises affiliées",
    "depenses": "Dépenses",
    "actualites": "Actualités",
    "leadership": "Leadership",
    "ministeres": "Ministères",
    "prieres": "Demandes de prière",
    "benevolat": "Bénévolat",
}


def flatten_stats(
    stats: BaseModel,
    field_labels: dict[str, str] | None = None,
) -> tuple[list[tuple[str, str]], dict[str, list[dict]]]:
    """Aplatit un objet de statistiques Pydantic en un résumé clé/valeur (champs
    scalaires) et des tables nommées (champs liste), quel que soit le domaine.

    `field_labels` (facultatif) substitue un libellé lisible au nom brut du
    champ Pydantic (ex. "income_cad" -> "Revenus (CAD)") dans le résumé —
    un champ absent du dict garde son nom brut, pour ne pas casser les
    domaines qui n'en fournissent pas."""
    labels = field_labels or {}
    summary: list[tuple[str, str]] = []
    tables: dict[str, list[dict]] = {}
    for name, value in stats.model_dump().items():
        if isinstance(value, list):
            tables[name] = value
        else:
            summary.append((labels.get(name, name), str(value)))
    return summary, tables


def fetch_ai_summary(domain_label: str, authorization: str) -> str | None:
    """Demande à l'assistant IA admin une courte synthèse du domaine. Meilleur
    effort : retourne None sur toute erreur ou dépassement de délai plutôt que de
    faire échouer la génération du rapport."""
    question = (
        f"Rédige une synthèse en 3 phrases maximum des statistiques du domaine "
        f"« {domain_label} »."
    )
    try:
        res = httpx.post(
            f"{settings.ai_service_url}/admin/chat",
            json={"question": question},
            headers={"Authorization": authorization},
            timeout=30.0,
        )
        res.raise_for_status()
        return res.json()["answer"]
    except (httpx.HTTPError, KeyError, ValueError):
        return None


def build_excel(
    title: str,
    summary: list[tuple[str, str]],
    tables: dict[str, list[dict]],
    ai_summary: str | None = None,
) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Résumé"
    ws.append([title])
    ws.append([])
    if ai_summary:
        ws.append(["Synthèse IA", ai_summary])
        ws.append([])
    for key, value in summary:
        ws.append([key, value])

    for name, rows in tables.items():
        sheet = wb.create_sheet(title=name[:31])
        if rows:
            headers = list(rows[0].keys())
            sheet.append(headers)
            for row in rows:
                sheet.append([row.get(h) for h in headers])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_csv(
    title: str,
    summary: list[tuple[str, str]],
    tables: dict[str, list[dict]],
    ai_summary: str | None = None,
) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([title])
    writer.writerow([])
    if ai_summary:
        writer.writerow(["Synthèse IA", ai_summary])
        writer.writerow([])
    writer.writerow(["Résumé"])
    for key, value in summary:
        writer.writerow([key, value])

    for name, rows in tables.items():
        writer.writerow([])
        writer.writerow([name])
        if rows:
            headers = list(rows[0].keys())
            writer.writerow(headers)
            for row in rows:
                writer.writerow([row.get(h) for h in headers])
        else:
            writer.writerow(["Aucune donnée."])

    # BOM UTF-8 : Excel affiche correctement les accents français à l'ouverture
    return buf.getvalue().encode("utf-8-sig")


def build_word(
    title: str,
    summary: list[tuple[str, str]],
    tables: dict[str, list[dict]],
    ai_summary: str | None = None,
) -> bytes:
    doc = Document()
    doc.add_heading(title, level=1)

    if ai_summary:
        doc.add_heading("Synthèse IA", level=2)
        doc.add_paragraph(ai_summary)

    doc.add_heading("Résumé", level=2)
    summary_table = doc.add_table(rows=0, cols=2)
    summary_table.style = "Light Grid Accent 1"
    for key, value in summary:
        row = summary_table.add_row().cells
        row[0].text = key
        row[1].text = value

    for name, rows in tables.items():
        doc.add_heading(name, level=2)
        if not rows:
            doc.add_paragraph("Aucune donnée.")
            continue
        headers = list(rows[0].keys())
        table = doc.add_table(rows=1, cols=len(headers))
        table.style = "Light Grid Accent 1"
        for i, h in enumerate(headers):
            table.rows[0].cells[i].text = h
        for row in rows:
            cells = table.add_row().cells
            for i, h in enumerate(headers):
                cells[i].text = str(row.get(h, ""))

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


_CELL_FONT_SIZE = 8
_WIDE_TABLE_COLUMN_THRESHOLD = 6


def build_pdf(
    title: str,
    summary: list[tuple[str, str]],
    tables: dict[str, list[dict]],
    ai_summary: str | None = None,
) -> bytes:
    buf = io.BytesIO()
    # Une table à beaucoup de colonnes (ex. rapport annuel par donateur : nom,
    # courriel, devise, 12 mois, total, nombre de dons) déborde de la marge en
    # portrait sans qu'aucune erreur ne soit levée — le PDF est simplement
    # tronqué au-delà de la largeur de page. Le format paysage, avec des
    # marges resserrées, donne la largeur nécessaire.
    wide = any(
        rows and len(rows[0]) > _WIDE_TABLE_COLUMN_THRESHOLD for rows in tables.values()
    )
    pagesize = landscape(letter) if wide else letter
    margin = 0.4 * inch if wide else inch
    doc = SimpleDocTemplate(
        buf,
        pagesize=pagesize,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=inch,
        bottomMargin=inch,
    )
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"]), Spacer(1, 12)]

    if ai_summary:
        story.append(Paragraph("Synthèse IA", styles["Heading2"]))
        story.append(Paragraph(ai_summary, styles["Normal"]))
        story.append(Spacer(1, 12))

    story.append(Paragraph("Résumé", styles["Heading2"]))
    summary_data = [[key, value] for key, value in summary]
    if summary_data:
        story.append(_styled_table(summary_data))
    story.append(Spacer(1, 12))

    for name, rows in tables.items():
        story.append(Paragraph(name, styles["Heading2"]))
        if not rows:
            story.append(Paragraph("Aucune donnée.", styles["Normal"]))
        else:
            headers = list(rows[0].keys())
            data = [headers] + [[str(row.get(h, "")) for h in headers] for row in rows]
            story.append(_styled_table(data, doc.width))
        story.append(Spacer(1, 12))

    doc.build(story)
    return buf.getvalue()


# Doit correspondre au LEFTPADDING/RIGHTPADDING de _styled_table ci-dessous :
# ignorer le remplissage des cellules dans le calcul de largeur fait
# systématiquement passer à la ligne les colonnes déjà les plus étroites.
_CELL_PADDING = 3.0


def _column_widths(data: list[list[str]], available_width: float) -> list[float]:
    """Répartit la largeur disponible entre les colonnes au prorata de leur
    contenu le plus long (plancher lisible en dessous), plutôt que de laisser
    reportlab dimensionner chaque colonne à son contenu sans limite — c'est
    cette absence de limite qui fait déborder le tableau de la page."""
    col_count = len(data[0])
    padding = _CELL_PADDING * 2
    max_lens = [
        padding
        + max(stringWidth(str(row[i]), "Helvetica", _CELL_FONT_SIZE) for row in data)
        for i in range(col_count)
    ]
    total = sum(max_lens) or 1
    min_width = 26.0 + padding
    widths = [max(min_width, available_width * (length / total)) for length in max_lens]
    scale = available_width / sum(widths)
    return [w * scale for w in widths]


def _styled_table(data: list[list[str]], available_width: float | None = None) -> Table:
    base_styles = getSampleStyleSheet()
    cell_style = ParagraphStyle(
        "tableCell", parent=base_styles["BodyText"],
        fontSize=_CELL_FONT_SIZE, leading=_CELL_FONT_SIZE + 2,
    )
    header_style = ParagraphStyle(
        "tableHeader", parent=cell_style,
        textColor=colors.white, fontName="Helvetica-Bold",
    )
    # Chaque cellule est enveloppée dans un Paragraph plutôt que passée comme
    # texte brut : seul un flowable retourne correctement à la ligne dans une
    # colonne étroite (ex. un long courriel) au lieu de déborder de sa cellule.
    wrapped = [
        [Paragraph(str(v), header_style if r == 0 else cell_style) for v in row]
        for r, row in enumerate(data)
    ]
    col_widths = _column_widths(data, available_width) if available_width else None
    table = Table(wrapped, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b2f8a")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), _CELL_PADDING),
                ("RIGHTPADDING", (0, 0), (-1, -1), _CELL_PADDING),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return table
