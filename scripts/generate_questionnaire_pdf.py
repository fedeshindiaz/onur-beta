from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "cuestionario-percepcion-onur.pdf"
PUBLIC = ROOT / "public" / "resources" / "cuestionario-percepcion-onur.pdf"

QUESTIONS = [
    "¿Cuánto le molestaron el mareo, el vértigo o la sensación de inestabilidad?",
    "¿Cuánto aumentaron sus molestias al mover la cabeza?",
    "¿Cuánto le molestaron los cambios de posición, por ejemplo levantarse o acostarse?",
    "¿Cuánto le molestaron los supermercados, las pantallas o los lugares con mucho movimiento visual?",
    "¿Cuánto le molestó sentir que la imagen saltaba, se movía o se veía borrosa?",
    "¿Cuánto le molestaron las náuseas u otras sensaciones físicas asociadas?",
    "¿Cuánta dificultad tuvo para caminar con seguridad dentro de su casa?",
    "¿Cuánta dificultad tuvo para caminar en la calle o sobre superficies irregulares?",
    "¿Cuánta dificultad tuvo para subir o bajar escaleras?",
    "¿Cuánta dificultad tuvo para girar o mover la cabeza mientras caminaba?",
    "¿Cuánto temor sintió de perder el equilibrio o caerse?",
    "¿Cuánto necesitó apoyarse o pedir ayuda para desplazarse?",
    "¿Cuánto interfirieron sus molestias con las tareas del hogar, el trabajo o el estudio?",
    "¿Cuánto interfirieron sus molestias con compras, trámites o traslados?",
    "¿Cuánto redujo sus actividades sociales o recreativas por sus molestias?",
    "¿Cuánta dificultad tuvo para concentrarse por sus molestias?",
    "¿Cuánto cansancio le generaron sus molestias o el esfuerzo por mantener el equilibrio?",
    "¿Cuánto afectaron estas molestias su bienestar y confianza para realizar actividades?",
]

DOMAINS = [
    ("Síntomas y sensaciones", 0, 6),
    ("Actividades y seguridad", 6, 12),
    ("Vida cotidiana y bienestar", 12, 18),
]

TEAL = colors.HexColor("#0B7A75")
DARK = colors.HexColor("#123238")
MUTED = colors.HexColor("#536B70")
PALE = colors.HexColor("#E8F5F2")
LINE = colors.HexColor("#B8C9C6")

pdfmetrics.registerFont(TTFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold", italic="DejaVu", boldItalic="DejaVu-Bold")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    canvas.setFont("DejaVu", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9 * mm, "ONUr - Cuestionario de percepción - Versión 2")
    canvas.drawRightString(192 * mm, 9 * mm, f"Página {doc.page}")
    canvas.restoreState()


def question_block(number, text, styles):
    option_style = ParagraphStyle(
        f"option-{number}",
        parent=styles["BodyText"],
        fontName="DejaVu-Bold",
        fontSize=8,
        leading=9.5,
        alignment=TA_CENTER,
        textColor=DARK,
    )
    options = ["□ 0<br/>Nada", "□ 1<br/>Poco", "□ 2<br/>Bastante", "□ 3<br/>Mucho", "□<br/>No aplica"]
    data = [[Paragraph(f"<b>{number}.</b> {text}", styles["Question"])], [Table([[Paragraph(option, option_style) for option in options]], colWidths=[33.8 * mm] * 5)]]
    block = Table(data, colWidths=[169 * mm])
    block.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (-1, 1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, 0), 8),
        ("RIGHTPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
        ("LEFTPADDING", (0, 1), (-1, 1), 0),
        ("RIGHTPADDING", (0, 1), (-1, 1), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 4),
    ]))
    return block


def build_pdf(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("TitleONUr", fontName="DejaVu-Bold", fontSize=22, leading=26, textColor=DARK, alignment=TA_LEFT, spaceAfter=5))
    styles.add(ParagraphStyle("Subtitle", fontName="DejaVu", fontSize=11, leading=15, textColor=MUTED, spaceAfter=12))
    styles.add(ParagraphStyle("Question", fontName="DejaVu", fontSize=9.7, leading=12.5, textColor=DARK))
    styles.add(ParagraphStyle("Domain", fontName="DejaVu-Bold", fontSize=14, leading=17, textColor=TEAL, spaceAfter=4))
    styles.add(ParagraphStyle("Instruction", fontName="DejaVu", fontSize=10, leading=14, textColor=DARK))
    styles.add(ParagraphStyle("Small", fontName="DejaVu", fontSize=8.5, leading=11, textColor=MUTED))

    document = BaseDocTemplate(str(path), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=17 * mm, bottomMargin=20 * mm, title="ONUr - Cuestionario de percepción")
    frame = Frame(document.leftMargin, document.bottomMargin, document.width, document.height, id="main")
    document.addPageTemplates([PageTemplate(id="questionnaire", frames=frame, onPage=footer)])

    story = [
        Paragraph("ONUr", styles["TitleONUr"]),
        Paragraph("Cuestionario de percepción del estado vestíbulo-visual", styles["Subtitle"]),
        Table([
            ["Nombre:", "", "Fecha:", ""],
            ["Profesional:", "", "Momento:", "[ ] Inicial   [ ] Final   [ ] Seguimiento"],
        ], colWidths=[22 * mm, 69 * mm, 21 * mm, 57 * mm], rowHeights=[10 * mm, 10 * mm], style=TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "DejaVu"),
            ("FONTNAME", (0, 0), (0, -1), "DejaVu-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "DejaVu-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW", (1, 0), (1, -1), 0.7, DARK),
            ("LINEBELOW", (3, 0), (3, 0), 0.7, DARK),
            ("BOX", (0, 0), (-1, -1), 0.7, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ])),
        Spacer(1, 4 * mm),
        Table([[Paragraph("<b>Cómo responder:</b> marque una sola opción por pregunta pensando en los últimos 7 días. Si una situación no corresponde, marque No aplica.", styles["Instruction"]) ]], colWidths=[169 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF6E4")),
            ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#D8B969")),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])),
        Spacer(1, 4 * mm),
    ]

    story.extend([Paragraph(DOMAINS[0][0], styles["Domain"]), Spacer(1, 1 * mm)])
    for index, question in enumerate(QUESTIONS[:6], start=1):
        story.extend([question_block(index, question, styles), Spacer(1, 2 * mm)])

    for domain, start, end in DOMAINS[1:]:
        story.extend([PageBreak(), Paragraph("Cuestionario de percepción", styles["TitleONUr"]), Paragraph(domain, styles["Domain"]), Paragraph("Continuación - marque una sola opción por pregunta.", styles["Subtitle"])])
        for index, question in enumerate(QUESTIONS[start:end], start=start + 1):
            story.extend([question_block(index, question, styles), Spacer(1, 2 * mm)])

    story.extend([
        Spacer(1, 1 * mm),
        Table([
            [Paragraph("<b>Estado general en los últimos 7 días</b> (0 = muy mal, 10 = muy bien)", styles["Instruction"])],
            [Table([[Paragraph(f"□ {value}", styles["Small"]) for value in range(11)]], colWidths=[14.7 * mm] * 11)],
            [Paragraph("<b>Caídas declaradas:</b> ________    <b>¿Usó apoyo para caminar?</b>  □ No  □ Sí", styles["Instruction"])],
        ], colWidths=[169 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.8, LINE),
            ("LINEBELOW", (0, 0), (-1, 1), 0.5, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])),
        Spacer(1, 2 * mm),
        Table([
            [Paragraph("<b>Uso profesional</b>", styles["Instruction"])],
            [Table([["Respuestas: ____ / 18", "Aplicables: ____ / 18", "Total: ____ / ____"]], colWidths=[54 * mm, 54 * mm, 54 * mm], style=TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), "DejaVu-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))],
        ], colWidths=[169 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 0.8, TEAL),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, 0), 8),
            ("RIGHTPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 5),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
            ("LEFTPADDING", (0, 1), (-1, 1), 0),
            ("RIGHTPADDING", (0, 1), (-1, 1), 0),
            ("TOPPADDING", (0, 1), (-1, 1), 0),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 0),
        ])),
        Spacer(1, 3 * mm),
        Paragraph("Instrumento propio no validado. Registra percepción para comparar momentos dentro de la misma persona. No tiene puntos de corte, no diagnostica, no determina causas y no reemplaza una evaluación profesional.", styles["Small"]),
    ])
    document.build(story)


if __name__ == "__main__":
    build_pdf(OUTPUT)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.write_bytes(OUTPUT.read_bytes())
    print(OUTPUT)
    print(PUBLIC)
