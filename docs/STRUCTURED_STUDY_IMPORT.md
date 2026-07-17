# Importación estructurada de estudios

## Alcance de la Beta

La Beta conserva el documento original y permite que el profesional transcriba o pegue valores estructurados. No ejecuta OCR ni interpreta automáticamente imágenes clínicas. El objetivo es obtener una derivación trazable y revisable sin reemplazar la fuente.

## Flujo

1. Cargar el archivo original y asociarlo a paciente, ciclo, tipo, protocolo y versión.
2. Abrir la revisión estructurada.
3. Transcribir filas o pegar una tabla delimitada.
4. Comparar el valor original con el valor normalizado.
5. Revisar incidencias de formato, unidad, rango, cero ambiguo y duplicación.
6. Determinar profesionalmente si el estudio es interpretable.
7. Confirmar la importación.
8. Revisar, editar, aceptar o descartar cada sugerencia generada.
9. Incluir manualmente en el informe solamente los hallazgos ya aceptados o editados.

Una fila en estado `blocked` o `quarantine` se conserva, pero no participa en sugerencias ni comparaciones.

## Formato para pegar tablas

Se aceptan columnas separadas por tabulador, punto y coma o coma. Para valores con coma decimal se recomienda punto y coma.

```csv
metrica;valor;unidad;condicion;lado;eje;repeticion;origen
condition_score;82,5;percent;A;;;1;Página 1
condition_score;74,1;percent;B;;;1;Página 1
```

Columnas mínimas: `metrica` y `valor`. Alias aceptados: `metric_code`, `raw_value`, `unit_code`, `condition_code`, `side`, `axis`, `trial_number` y `source_location`.

## Reglas de normalización v1

- La coma o el punto decimal se convierten de manera reproducible.
- El sufijo `%` permite reconocer la unidad porcentual.
- `No aplica`, `No registrado` y `Desconocido` permanecen diferenciados.
- Un valor original nunca se reemplaza ni se corrige silenciosamente.
- Una unidad ausente o desconocida bloquea comparaciones numéricas.
- Un porcentaje fuera de 0–100 queda en cuarentena técnica.
- Un cero en una variable que no lo admite solicita confirmación.
- Dos filas con la misma métrica, condición, lado, eje y repetición quedan en revisión como posibles duplicados.

Los rangos anteriores son controles de formato o plausibilidad técnica; no son puntos de corte clínicos.

## Sugerencias habilitadas

La primera implementación genera únicamente:

- perfil descriptivo de condiciones bAp para protocolos configurados;
- diferencias absolutas frente al estudio anterior cuando coinciden tipo, protocolo, versión, método, métrica, unidad, condición, lado, eje y repetición.

No aplica tablas normativas por edad, no calcula el índice 3PD, no predice caídas, no diagnostica y no recomienda ejercicios o tratamientos.

Texto obligatorio:

> Resultado estadístico orientativo. Requiere correlación clínica y revisión profesional. No constituye diagnóstico ni recomendación médica.

## Persistencia y auditoría

La confirmación se ejecuta en una transacción PostgreSQL mediante `replace_study_import`. La función reemplaza solamente un borrador o estudio revisado, guarda métricas e incidencias, registra el trabajo de importación, ejecuta reglas aprobadas y deja un evento de auditoría.

Un estudio `finalized` no puede reemplazarse. Las decisiones sobre sugerencias se registran mediante `review_statistical_suggestion` y crean o actualizan la revisión profesional auditada.
