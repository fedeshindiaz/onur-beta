# Generación clínicamente gobernada de ejercicios

## Estado implementado

La plataforma incorpora la base segura para un generador de borradores, no una prescripción automática:

- catálogo versionado de 30 fuentes en `src/features/clinicalGeneration/catalog.ts`;
- taxonomía cerrada de 12 categorías;
- compuerta previa de autorización, datos clínicos y alertas;
- rechazo recursivo de valores `COMPLETAR_*`, `PENDIENTE` o `TBD`;
- validación estricta del JSON generado, de los códigos taxonómicos y de cada `source_id`;
- obligación de mantener `clinician_review_status=draft_unreviewed`;
- prohibición de incluir ejercicios en una respuesta bloqueada.

El endpoint o proveedor de IA todavía no se conecta a esta capa. Cuando se conecte, la autorización deberá derivarse en servidor de la sesión autenticada; el booleano enviado por el navegador nunca será suficiente.

## Orden de la compuerta

1. Confirmar profesional autenticado y autorizado y la aceptación explícita de revisión.
2. Confirmar los 28 campos clínicos requeridos.
3. Exigir tamizaje de alertas completado.
4. Si existe una alerta, devolver `blocked_safety_trigger` y ningún ejercicio.
5. Si faltan datos, devolver `blocked_missing_clinical_input`.
6. Solo entonces habilitar la creación de un `draft_unreviewed`.
7. Validar estructura, taxonomía y fuentes antes de guardar.
8. No publicar ni asignar hasta aprobación clínica humana.

## Resultado del JSON recibido

El ejemplo con `clinician_authorized=false` y campos `COMPLETAR_*` debe quedar bloqueado. No existe información suficiente ni autorización para crear un ejercicio, elegir dosis o sugerir una progresión.

## Correcciones de catálogo verificadas

- `SRC-005`: PMID `38872828`.
- `SRC-014`: año 2025 y PMID `41288240`.
- `SRC-029`: DOI `10.1016/j.arcped.2024.02.006`; no extrapolar dosis adulta y no recomendar exposición optocinética/VR a niños o adolescentes jóvenes sin regla pediátrica específica.
- `SRC-030`: enlace vigente del CDC revisado el 19 de julio de 2026.

La biblioteca debe revisarse como mínimo una vez al año y cuando aparezca una guía relevante nueva.
