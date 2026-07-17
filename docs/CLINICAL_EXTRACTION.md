# Extracción clínica privada y revisable

ONUr Beta procesa posturografías BAP, estudios vestibulares, vHIT e informes escaneados como borradores. El original se conserva sin modificaciones en el bucket privado `clinical-documents`. Ningún valor extraído pasa a `metric_values` hasta que un profesional propietario del paciente lo confirma.

## Flujo profesional

1. Seleccionar el paciente antes del archivo.
2. Elegir `POSTUROGRAFÍA BAP` o `ESTUDIOS VESTIBULARES, vHIT E INFORMES`.
3. Arrastrar, pegar, seleccionar o fotografiar un PDF/JPG/JPEG/PNG/WEBP.
4. Revisar la clasificación de cada página. Un PDF mixto conserva un solo original y crea secciones vinculadas.
5. Revisar raw exacto, normalizado, unidad, página, región, confianza, método y versión.
6. Completar solamente lo faltante, resolver cualquier discrepancia de identidad y confirmar cada valor presente.
7. Guardar el borrador, confirmar la transcripción o continuar con carga completamente manual.

El paciente no recibe permiso durante la carga. Solo puede acceder posteriormente mediante solicitud y aprobación profesional.

## Campos iniciales

Posturografía: software/versión, fecha/hora/duración/estado/escala, edad consignada, límites adelante/atrás/izquierda/derecha/área, Sway X/Y, patrón Afis, Score LOS, Def. Mix Ve Som, Def. Mixto Ve Vi, índice PPPD, condiciones 1–8, compuesto, porcentaje de condiciones, organización y distribución sensorial y conclusión literal.

Vestibular/vHIT: fecha, institución, tipo, profesional, motivo, antecedentes, síntomas, evolución, examen, HIMP, SHIMP, resultados, ganancias por lado, simetría, sacadas, curvas/canales, VII par, fijación, supresión visual, SKEW, Head Shaking, vibracional, cancelación VOR, posicionales, marcha, sistema sacádico, seguimiento lento, sensibilidad, reflejos, conclusión, conducta y observaciones.

## Límites deliberados

- El OCR local puede requerir corrección en fotos con perspectiva, baja resolución, tablas complejas o texto manuscrito.
- La detección de rotación y el contraste son ayudas temporales; el original nunca se modifica.
- No se interpretan curvas, iconos ni significados clínicos sin un código de métrica confirmado.
- No se infieren datos ilegibles, diagnósticos, causalidad ni tratamientos.
- Cédula y sexo no se comparan si el perfil seleccionado no conserva esos datos en forma utilizable; la coincidencia queda para confirmación profesional.
- La revisión de imágenes y PDF resalta una región cuando PDF.js/Tesseract devuelve coordenadas confiables.

## Pruebas

Los fixtures de `tests/fixtures/synthetic-clinical` son totalmente sintéticos, se regeneran con `scripts/generate_synthetic_clinical_fixtures.py` y llevan una advertencia visible. Los documentos clínicos de referencia no forman parte del repositorio, build, CI ni staging.
