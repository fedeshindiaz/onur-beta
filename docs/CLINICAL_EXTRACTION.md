# Extracción clínica privada y revisable

ONUr Beta utiliza OCR local para preparar un borrador de parámetros de posturografías BAP, estudios vestibulares, vHIT e informes escaneados. El archivo original queda inalterado en el bucket privado `clinical-documents`; ningún dato pasa al informe confirmado sin intervención de un profesional propietario del paciente.

## Flujo simplificado

1. Abrir **Cargar estudio**, seleccionar el paciente, tipo, fecha y archivo PDF/JPG/JPEG/PNG/WEBP.
2. El navegador procesa el archivo localmente. Para BAP se amplía la imagen, se prueba contraste y orientación, y se leen tanto rótulos como valores por posición en los gráficos.
3. Revisar solamente los **parámetros obtenidos** y corregir los que estén marcados para revisar o faltantes.
4. Redactar la **conclusión profesional** y la **sugerencia profesional de rehabilitación** según la valoración clínica.
5. Confirmar y generar el informe, o guardar el borrador para continuar luego.

Las opciones técnicas y el descarte permanecen disponibles dentro de **Opciones avanzadas**. La interfaz no muestra pasos de normalización, confirmación individual ni clasificaciones que no sean necesarios para la revisión clínica.

## BAP y reanálisis

La versión `onur-local-ocr-1.1` mejora la lectura de capturas y fotos de BAP: aumenta la resolución útil, usa segmentación de texto disperso, aplica una segunda lectura con contraste y prueba rotación cuando la lectura inicial no es suficiente. También reconoce paneles compactos y los puntajes de condiciones/organización sensorial por la posición de las barras.

Al abrir un borrador creado con una versión anterior, ONUr vuelve a analizar el original privado en el navegador y conserva las correcciones profesionales que difieran de la lectura anterior. El reprocesamiento queda auditado sin almacenar el contenido clínico en el registro de auditoría.

## Límites y seguridad

- El OCR es una ayuda de transcripción; puede requerir corrección en fotos con perspectiva, baja resolución, tablas complejas o texto manuscrito.
- ONUr no interpreta curvas, no diagnostica, no infiere causalidad y no recomienda tratamientos automáticamente.
- La conclusión y la sugerencia de rehabilitación son textos obligatoriamente redactados y confirmados por el profesional responsable.
- El paciente no participa de la carga ni recibe acceso al original durante la revisión.
- Los documentos y valores clínicos no se imprimen en consola ni se usan como fixtures, logs o datos de staging.

## Pruebas

Los archivos en `tests/fixtures/synthetic-clinical` son exclusivamente sintéticos, se regeneran con `scripts/generate_synthetic_clinical_fixtures.py` y llevan una advertencia visible. No se incluyen documentos clínicos reales en el repositorio, la compilación, CI ni staging.
