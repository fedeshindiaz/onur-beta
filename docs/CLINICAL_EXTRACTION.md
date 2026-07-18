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

La versión `onur-local-ocr-1.3` usa varias lecturas complementarias: página completa, contraste general y regiones específicas del panel izquierdo, gráficos y pie. En los gráficos realiza dos binarizaciones para recuperar dígitos impresos sobre fondos celestes, verdes, grises o degradados. Los encabezados de condiciones y organización sensorial se usan como anclas; de ese modo, los porcentajes del gráfico circular o los números de los ejes no se confunden con C1-C6.

Al abrir un borrador creado con una versión anterior, ONUr vuelve a analizar el original privado en el navegador y conserva las correcciones profesionales que difieran de la lectura anterior. El reprocesamiento queda auditado sin almacenar el contenido clínico en el registro de auditoría.

## Corpus y medición de precisión

El corpus reproducible `bap_ocr_corpus_synthetic.json` incluye capturas limpias, pequeñas, comprimidas, borrosas, de bajo contraste y con números señuelo. Cada archivo declara once resultados esperados: seis condiciones, compuesto y cuatro índices de organización sensorial. Ninguna muestra contiene datos personales ni procede de una historia clínica.

Ejecutar `npm run ocr:benchmark` para medir el reconocimiento real con Tesseract y el mismo perfil de regiones que usa el navegador. La prueba falla si la precisión campo por campo baja de 95 %. Este umbral es técnico y no certifica interpretabilidad clínica.

## Límites y seguridad

- El OCR es una ayuda de transcripción; puede requerir corrección en fotos con perspectiva, baja resolución, tablas complejas o texto manuscrito.
- ONUr no interpreta curvas, no diagnostica, no infiere causalidad y no recomienda tratamientos automáticamente.
- La conclusión y la sugerencia de rehabilitación son textos obligatoriamente redactados y confirmados por el profesional responsable.
- El paciente no participa de la carga ni recibe acceso al original durante la revisión.
- Los documentos y valores clínicos no se imprimen en consola ni se usan como fixtures, logs o datos de staging.

## Pruebas

Los archivos en `tests/fixtures/synthetic-clinical` son exclusivamente sintéticos, se regeneran con `scripts/generate_synthetic_clinical_fixtures.py` y llevan una advertencia visible. No se incluyen documentos clínicos reales en el repositorio, la compilación, CI ni staging.

El benchmark ampliado cubre varias degradaciones del mismo diseño BAP, pero una plantilla nueva, un recorte severo o una fotografía con reflejos todavía puede requerir corrección manual y un nuevo caso sintético equivalente.
