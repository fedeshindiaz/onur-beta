"""Genera fixtures clínicos 100 % sintéticos, sin datos personales ni valor asistencial."""

from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
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
    # Pillow espera las esquinas en orden superior-izquierda, inferior-izquierda,
    # inferior-derecha y superior-derecha.
    perspective = source.transform((1300, 1650), Image.Transform.QUAD, (70, 90, 0, 1600, 1190, 1530, 1130, 0), resample=Image.Resampling.BICUBIC)
    perspective = perspective.filter(ImageFilter.GaussianBlur(radius=0.35))
    perspective.save(TARGET / "bap_perspective_synthetic.jpg", quality=88)


def make_bap_screen(
    name: str = "bap_screen_synthetic.png",
    condition_values: list[int] | None = None,
    sensory_values: list[int] | None = None,
) -> None:
    condition_values = condition_values or [90, 99, 98, 82, 79, 27, 81]
    sensory_values = sensory_values or [100, 82, 80, 70]
    image = Image.new("RGB", (1600, 900), (238, 242, 241))
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(REPORTLAB_FONTS / "Vera.ttf"), 22)
    small = ImageFont.truetype(str(REPORTLAB_FONTS / "Vera.ttf"), 18)
    bold = ImageFont.truetype(str(REPORTLAB_FONTS / "VeraBd.ttf"), 22)

    draw.rectangle((0, 0, 1600, 52), fill=(245, 247, 247))
    draw.text((18, 14), "Posturografo V2.3.2 · BAP · DOCUMENTO SINTETICO SIN DATOS PERSONALES", fill=(22, 55, 60), font=small)
    draw.rectangle((18, 72, 395, 750), fill=(65, 169, 192))
    draw.text((45, 92), "BAP POSTUROGRAFIA", fill="white", font=bold)
    entries = [
        "Adel = -07,73   Atras = 04,31",
        "Izqui = -03,37  Derech = 03,02",
        "Area = 60,02 cm2   Escala = X10",
        "Sway X = 3 deg     Sway Y = 4 deg",
        "Patron Afis: 27,5 %",
        "Score LOS: 100 %",
        "Def Mix Ve Som: 49,6 %",
        "Def Mixto Ve Vi: 44,9 %",
        "Indice PPPD: ∞",
    ]
    for index, value in enumerate(entries):
        y = 165 + index * 55
        draw.rectangle((34, y - 8, 379, y + 38), fill=(108, 195, 214), outline=(26, 102, 120), width=2)
        draw.text((46, y), value, fill=(12, 47, 55), font=small)

    draw.rectangle((420, 72, 1045, 750), fill="white", outline=(174, 194, 192), width=2)
    draw.text((620, 108), "ESTABILOGRAMA", fill=(22, 55, 60), font=bold)
    for radius in range(55, 255, 38):
        draw.ellipse((730 - radius, 405 - radius, 730 + radius, 405 + radius), outline=(115, 155, 161), width=2)
    draw.line((480, 405, 980, 405), fill=(52, 94, 100), width=2)
    draw.line((730, 155, 730, 655), fill=(52, 94, 100), width=2)
    draw.line([(670, 470), (705, 390), (748, 442), (770, 340), (820, 405)], fill=(216, 66, 66), width=5)

    chart_left, chart_top, chart_right, chart_bottom = 1080, 90, 1575, 455
    draw.rectangle((chart_left, chart_top, chart_right, chart_bottom), fill=(91, 184, 210), outline=(44, 116, 137), width=2)
    draw.text((1160, 105), "PORCENTAJE DE CONDICIONES", fill=(10, 53, 61), font=small)
    for index, value in enumerate(condition_values):
        x = 1125 + index * 63
        bar_height = value * 2.5
        draw.rectangle((x, 410 - bar_height, x + 34, 410), fill=(115, 211, 107))
        draw.text((x + 3, 382 - bar_height), str(value), fill=(7, 50, 57), font=small)
        draw.text((x + 9, 420), str(index + 1) if index < 6 else "Com", fill=(7, 50, 57), font=small)

    sensory_top, sensory_bottom = 500, 835
    draw.rectangle((chart_left, sensory_top, chart_right, sensory_bottom), fill=(91, 184, 210), outline=(44, 116, 137), width=2)
    draw.text((1150, 514), "TEST DE ORGANIZACION SENSORIAL", fill=(10, 53, 61), font=small)
    sensory_labels = ["Som.", "Visual", "Vest.", "Pref. visual"]
    for index, value in enumerate(sensory_values):
        x = 1125 + index * 105
        bar_height = value * 2.15
        draw.rectangle((x, 790 - bar_height, x + 55, 790), fill=(115, 211, 107))
        draw.text((x + 8, 762 - bar_height), str(value), fill=(7, 50, 57), font=small)
        draw.text((x, 800), sensory_labels[index], fill=(7, 50, 57), font=small)

    draw.rectangle((420, 780, 1045, 850), fill="white", outline=(174, 194, 192), width=2)
    draw.text((450, 798), "Fecha: 17/07/2026    Edad: 76    Estado: Finalizada", fill=(22, 55, 60), font=font)
    draw.text((24, 862), "DOCUMENTO SINTETICO · NO USAR CLINICAMENTE", fill=(166, 33, 46), font=bold)
    image.save(TARGET / name)


def chart_expectations(condition_values: list[int], sensory_values: list[int]) -> dict[str, str]:
    return {
        **{f"condition_{index + 1}": str(value) for index, value in enumerate(condition_values[:6])},
        "composite_score": str(condition_values[6]),
        "sensory_somatosensory": str(sensory_values[0]),
        "sensory_visual": str(sensory_values[1]),
        "sensory_vestibular": str(sensory_values[2]),
        "visual_preference": str(sensory_values[3]),
    }


def make_bap_ocr_corpus() -> None:
    """Crea un corpus BAP variado, reproducible y totalmente sintético."""
    cases = [
        ("bap_screen_synthetic.png", [90, 99, 98, 82, 79, 27, 81], [100, 82, 80, 70]),
        ("bap_screen_clean_a_synthetic.png", [93, 88, 76, 61, 54, 32, 68], [94, 73, 58, 79]),
        ("bap_screen_clean_b_synthetic.png", [99, 97, 95, 83, 80, 28, 82], [98, 86, 74, 91]),
        ("bap_screen_low_scores_synthetic.png", [72, 68, 55, 49, 34, 21, 50], [89, 62, 47, 66]),
    ]
    manifest: list[dict[str, object]] = []
    for name, conditions, sensory in cases:
        make_bap_screen(name, conditions, sensory)
        manifest.append({"file": name, "variant": "clean", "expected": chart_expectations(conditions, sensory)})

    source_name, source_conditions, source_sensory = cases[1]
    source = Image.open(TARGET / source_name).convert("RGB")
    derived: list[tuple[str, str, Image.Image]] = [
        ("bap_screen_small_synthetic.jpg", "small-jpeg", source.resize((960, 540), Image.Resampling.LANCZOS)),
        ("bap_screen_low_contrast_synthetic.jpg", "low-contrast", ImageEnhance.Contrast(source).enhance(0.62).filter(ImageFilter.GaussianBlur(0.35))),
        ("bap_screen_blurred_synthetic.png", "slight-blur", source.filter(ImageFilter.GaussianBlur(0.8))),
    ]
    for name, variant, image in derived:
        if name.endswith(".jpg"):
            image.save(TARGET / name, quality=58)
        else:
            image.save(TARGET / name)
        manifest.append({"file": name, "variant": variant, "expected": chart_expectations(source_conditions, source_sensory)})

    # La interfaz real suele verse más alta e incluye un panel circular sobre
    # las barras. Estos números señuelo comprueban que no se confundan con C1-C6.
    tall = Image.new("RGB", (1600, 1100), (226, 220, 222))
    tall.paste(Image.open(TARGET / cases[2][0]).convert("RGB"), (0, 180))
    tall_draw = ImageDraw.Draw(tall)
    tall_font = ImageFont.truetype(str(REPORTLAB_FONTS / "VeraBd.ttf"), 20)
    tall_draw.text((1330, 45), "38 %", fill=(20, 55, 60), font=tall_font)
    tall_draw.text((1330, 82), "31 %", fill=(20, 55, 60), font=tall_font)
    tall_draw.text((1330, 119), "30 %", fill=(20, 55, 60), font=tall_font)
    tall_name = "bap_screen_tall_synthetic.png"
    tall.save(TARGET / tall_name)
    manifest.append({"file": tall_name, "variant": "tall-with-distractors", "expected": chart_expectations(cases[2][1], cases[2][2])})
    tall_jpeg_name = "bap_screen_tall_compressed_synthetic.jpg"
    tall.save(TARGET / tall_jpeg_name, quality=60)
    manifest.append({"file": tall_jpeg_name, "variant": "tall-compressed", "expected": chart_expectations(cases[2][1], cases[2][2])})

    (TARGET / "bap_ocr_corpus_synthetic.json").write_text(
        json.dumps({"synthetic": True, "clinical_use": False, "cases": manifest}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


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


if __name__ == "__main__":
    if "--bap-images-only" in sys.argv:
        make_perspective_photo()
        make_bap_ocr_corpus()
    else:
        make_pdf("bap_clear_synthetic.pdf", [bap_page])
        make_pdf("vestibular_report_synthetic.pdf", [vestibular_page])
        make_pdf("mixed_multipage_synthetic.pdf", [vestibular_page, bap_page, referral_page])
        make_pdf("unrecognized_synthetic.pdf", [unrecognized_page])
        make_perspective_photo()
        make_bap_ocr_corpus()
        make_rotated_vhit()
