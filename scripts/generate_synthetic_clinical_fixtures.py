"""Genera fixtures clínicos 100 % sintéticos, sin datos personales ni valor asistencial."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
import reportlab

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "tests" / "fixtures" / "synthetic-clinical"
TARGET.mkdir(parents=True, exist_ok=True)
REPORTLAB_FONTS = Path(reportlab.__file__).resolve().parent / "fonts"
pdfmetrics.registerFont(TTFont("FixtureSans", str(REPORTLAB_FONTS / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("FixtureSans-Bold", str(REPORTLAB_FONTS / "VeraBd.ttf")))


def header(pdf: canvas.Canvas, title: str) -> float:
    width, height = A4
    pdf.setFillColorRGB(0.05, 0.45, 0.43)
    pdf.rect(0, height - 72, width, 72, fill=1, stroke=0)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont("FixtureSans-Bold", 16)
    pdf.drawString(42, height - 43, title)
    pdf.setFillColorRGB(0.72, 0.1, 0.13)
    pdf.setFont("FixtureSans-Bold", 10)
    pdf.drawString(42, height - 90, "DOCUMENTO SINTÉTICO - SIN DATOS PERSONALES - NO USAR CLÍNICAMENTE")
    return height - 125


def lines(pdf: canvas.Canvas, y: float, values: list[str]) -> None:
    pdf.setFillColorRGB(0.08, 0.16, 0.18)
    for value in values:
        pdf.setFont("FixtureSans", 11)
        pdf.drawString(48, y, value)
        y -= 24


def bap_page(pdf: canvas.Canvas) -> None:
    y = header(pdf, "POSTUROGRAFÍA BAP - CASO DE PRUEBA")
    lines(pdf, y, [
        "Software: Posturógrafo V2.3.2", "Fecha: 17/07/2026", "Hora: 10:30", "Duración: 08:15",
        "Estado: Completo", "Escala: Porcentaje", "Adelante: 82,5 %", "Atrás: 74,0 %",
        "Izquierda: -3,5 %", "Derecha: 79,2 %", "Área: 12,4 cm2", "Sway X: 1,2 deg",
        "Sway Y: 0,8 deg", "Patrón Afis: No aplica", "Score LOS: 78", "Índice PPPD: ∞",
        "Condición 1: 91 %", "Condición 2: 86 %", "Condición 3: 73 %", "Condición 4: 64 %",
        "Condición 5:", "Compuesto: 78 %", "Somatosensorial: 95 %", "Visual: 81 %",
        "Vestibular: 67 %", "Preferencia visual: 88 %", "Conclusión: Texto literal sintético para verificar transcripción.",
    ])


def vestibular_page(pdf: canvas.Canvas) -> None:
    y = header(pdf, "INFORME VESTIBULAR / vHIT - CASO DE PRUEBA")
    lines(pdf, y, [
        "Fecha del estudio: 17/07/2026", "Institución: CENTRO SINTÉTICO", "Tipo de documento: Informe vestibular",
        "Motivo de derivación: Texto sintético de control.", "Antecedentes: No aplica", "Síntomas: Texto literal de prueba.",
        "HIMP: realizado", "SHIMP: realizado", "Ganancia derecha: 0,88", "Ganancia izquierda: 0,82",
        "Simetría: 4,2 %", "Sacadas: ausentes", "Canales evaluados: horizontal derecho e izquierdo",
        "Supresión visual: conservada", "SKEW: negativo", "Head Shaking Test: negativo",
        "Pruebas posicionales: No registrado", "Marcha: texto sintético", "Conclusión: En suma, texto literal sintético.",
        "Conducta: campo reservado para revisión profesional.",
    ])


def make_pdf(name: str, page_builders: list) -> None:
    pdf = canvas.Canvas(str(TARGET / name), pagesize=A4, pageCompression=1)
    for builder in page_builders:
        builder(pdf)
        pdf.showPage()
    pdf.save()


def make_perspective_photo() -> None:
    source = Image.new("RGB", (1200, 1600), "white")
    draw = ImageDraw.Draw(source)
    font = ImageFont.load_default(size=28)
    draw.rectangle((0, 0, 1200, 120), fill=(13, 112, 106))
    draw.text((45, 38), "POSTUROGRAFIA BAP - DOCUMENTO SINTETICO", fill="white", font=font)
    entries = ["Adelante: 81,5 %", "Atras: 72,0 %", "Izquierda: 76,2 %", "Derecha: 78,1 %", "Area: 11,8 cm2", "Condicion 1: 90 %", "Condicion 2: 84 %", "Compuesto: 79 %", "No usar clinicamente"]
    for index, value in enumerate(entries):
        draw.text((90, 220 + index * 105), value, fill=(25, 42, 45), font=font)
    perspective = source.transform((1300, 1650), Image.Transform.QUAD, (70, 90, 1130, 0, 1190, 1530, 0, 1600), resample=Image.Resampling.BICUBIC)
    perspective = perspective.filter(ImageFilter.GaussianBlur(radius=0.35))
    perspective.save(TARGET / "bap_perspective_synthetic.jpg", quality=88)


def make_rotated_vhit() -> None:
    image = Image.new("RGB", (1400, 900), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=28)
    draw.text((60, 60), "vHIT GRAFICO SINTETICO - NO CLINICO", fill=(13, 112, 106), font=font)
    draw.text((60, 130), "Ganancia derecha: 0,91   Ganancia izquierda: 0,87", fill=(25, 42, 45), font=font)
    for offset, color in [(0, (28, 125, 119)), (18, (197, 92, 67))]:
        points = [(80 + x, 500 + offset - int(120 * __import__('math').sin(x / 75))) for x in range(0, 1100, 8)]
        draw.line(points, fill=color, width=5)
    draw.rectangle((1000, 690, 1340, 790), fill="white")
    draw.text((1010, 720), "VALOR ILEG...", fill=(170, 170, 170), font=font)
    image.rotate(90, expand=True, fillcolor="white").save(TARGET / "vhit_rotated_partial_synthetic.png")


def referral_page(pdf: canvas.Canvas) -> None:
    y = header(pdf, "ORDEN / DERIVACIÓN - CASO DE PRUEBA")
    lines(pdf, y, ["Orden médica: evaluación vestibular", "Motivo de derivación: texto sintético", "Sin datos personales."])


def unrecognized_page(pdf: canvas.Canvas) -> None:
    y = header(pdf, "ARCHIVO NO RECONOCIDO - CASO DE PRUEBA")
    lines(pdf, y, ["ALFA 123", "BETA XYZ", "Contenido deliberadamente insuficiente para clasificar."])


make_pdf("bap_clear_synthetic.pdf", [bap_page])
make_pdf("vestibular_report_synthetic.pdf", [vestibular_page])
make_pdf("mixed_multipage_synthetic.pdf", [vestibular_page, bap_page, referral_page])
make_pdf("unrecognized_synthetic.pdf", [unrecognized_page])
make_perspective_photo()
make_rotated_vhit()
