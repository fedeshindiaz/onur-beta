# Extracción clínica privada y revisable

ONUr Beta utiliza OCR local para preparar un borrador de parámetros de posturografías BAP, estudios vestibulares, vHIT e informes escaneados. El archivo original queda inalterado en el bucket privado `clinical-documents`; ningún dato pasa al informe confirmado sin intervención de un profesional propietario del paciente.

## Flujo simplificado

1. Abrir **Cargar estudio**, seleccionar el paciente, tipo, fecha y archivo PDF/JPG/JPEG/PNG/WEBP.
2. El navegador procesa el archivo localmente. Para BAP se amplía la imagen, se prueba contraste y orientación, y se leen tanto rótulos como valores por posición en los gráficos.
3. Revisar solamente los **parámetros obtenidos** y corregir los que estén marcados para revisar o faltantes.
4. Revisar y editar el borrador automático de **conclusión** y **sugerencia de rehabilitación** según la valoración clínica.
5. Confirmar y generar el informe, o guardar el borrador para continuar luego.

Las opciones técnicas y el descarte permanecen disponibles dentro de **Opciones avanzadas**. La interfaz no muestra pasos de normalización, confirmación individual ni clasificaciones que no sean necesarios para la revisión clínica.

## BAP y reanálisis

La versión `onur-local-ocr-1.3` usa varias lecturas complementarias: página completa, contraste general y regiones específicas del panel izquierdo, gráficos y pie. En los gráficos realiza dos binarizaciones para recuperar dígitos impresos sobre fondos celestes, verdes, grises o degradados. Los encabezados de condiciones y organización sensorial se usan como anclas; de ese modo, los porcentajes del gráfico circular o los números de los ejes no se confunden con C1-C6.

Al abrir un borrador creado con una versión anterior, ONUr vuelve a analizar el original privado en el navegador y conserva las correcciones profesionales que difieran de la lectura anterior. El reprocesamiento queda auditado sin almacenar el contenido clínico en el registro de auditoría.

## Borrador automático de conclusión y rehabilitación

Para posturografías BAP, ONUr compara los valores mostrados con referencias por edad transcriptas exclusivamente del paquete local seguro `PAQUETE_SEGURO_PARA_WORK`:

- `09_TABLA_VALORES_NORMALES_BAP.xlsx`: condiciones, Composite y cocientes sensoriales;
- `08_VALORES_REFERENCIA_BAP.xlsx`: límites superiores de indicadores de patrón;
- `04_INTERPRETACION_BAP.md`: lenguaje funcional y posibles componentes de rehabilitación.

La aplicación completa los dos textos cuando están vacíos. Si el profesional ya los editó, no los sobrescribe: el botón **Regenerar desde parámetros** solicita confirmación antes de reemplazarlos. La sección **Cómo se generó este borrador** muestra cada comparación, las advertencias por datos faltantes y las fuentes utilizadas.

El motor usa únicamente los valores visibles en la pantalla de revisión. Los valores por debajo de la referencia inferior se describen como reducidos; los indicadores de patrón solo se señalan cuando superan el límite superior consignado. Sin edad válida no clasifica contra la norma. Un indicador afisiológico elevado prioriza el control de calidad y la repetición de condiciones antes de proponer objetivos.

## Corpus y medición de precisión

El corpus reproducible `bap_ocr_corpus_synthetic.json` incluye capturas limpias, pequeñas, comprimidas, borrosas, de bajo contraste y con números señuelo. Cada archivo declara once resultados esperados: seis condiciones, compuesto y cuatro índices de organización sensorial. Ninguna muestra contiene datos personales ni procede de una historia clínica.

Ejecutar `npm run ocr:benchmark` para medir el reconocimiento real con Tesseract y el mismo perfil de regiones que usa el navegador. La prueba falla si la precisión campo por campo baja de 95 %. Este umbral es técnico y no certifica interpretabilidad clínica.

## Límites y seguridad

- El OCR es una ayuda de transcripción; puede requerir corrección en fotos con perspectiva, baja resolución, tablas complejas o texto manuscrito.
- ONUr no interpreta curvas, no diagnostica ni infiere causalidad. El borrador de rehabilitación es orientación funcional basada en reglas, no una prescripción cerrada.
- La conclusión y la sugerencia de rehabilitación son editables y solo pasan al informe después de la confirmación del profesional responsable.
- Las referencias locales son heterogéneas y todavía requieren validación clínica formal antes del uso asistencial con datos reales.
- El paciente no participa de la carga ni recibe acceso al original durante la revisión.
- Los documentos y valores clínicos no se imprimen en consola ni se usan como fixtures, logs o datos de staging.

## Informes escaneados y OCR 1.4

La version `onur-local-ocr-1.4` agrega una lectura de bloque en la zona inferior de los informes vestibulares escaneados. Esto permite recomponer `En suma` y `Conducta` cuando ocupan varios renglones y descartar fragmentos duplicados de la lectura de pagina completa. Si el tipo de documento no esta escrito literalmente, se propone desde la clasificacion de pagina y queda marcado para revision profesional.

La regresion usa `vestibular_report_scanned_synthetic.jpg`, una imagen completamente ficticia con perspectiva, resumen multilinea y conducta. Ningun documento real se incorpora al corpus.

## Pruebas

Los archivos en `tests/fixtures/synthetic-clinical` son exclusivamente sintéticos, se regeneran con `scripts/generate_synthetic_clinical_fixtures.py` y llevan una advertencia visible. No se incluyen documentos clínicos reales en el repositorio, la compilación, CI ni staging.

El benchmark ampliado cubre varias degradaciones del mismo diseño BAP, pero una plantilla nueva, un recorte severo o una fotografía con reflejos todavía puede requerir corrección manual y un nuevo caso sintético equivalente.
