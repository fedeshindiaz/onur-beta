# Documentos, evaluaciones e informes

## Documentos clínicos

- Bucket privado `clinical-documents`.
- Ruta: `{professional_id}/{patient_id}/{uuid}-{filename_seguro}`.
- PDF, JPG, PNG, WEBP, XLS y XLSX; máximo 25 MB.
- Se registra nombre original, MIME, tamaño, SHA-256, fecha clínica, ciclo y descripción.
- Posturografía y vHIT crean también un estudio en estado `draft`.
- El paciente solo puede leer documentos con un permiso no revocado.

Tras confirmar la importación, el estudio queda `reviewed`. El profesional puede finalizarlo: ONUr calcula una huella SHA-256 y vuelve inmutables el estudio, sus métricas, incidencias y registro de importación. Las sugerencias derivadas permanecen separadas y pueden revisarse después sin alterar los valores finalizados.

El permiso está desactivado por defecto. Cuando se concede, permanece activo hasta que el profesional lo revoque manualmente.

El portal muestra un catálogo seguro de documentos bloqueados sin incluir la ruta privada de Storage. El paciente puede solicitar acceso y el profesional decide entre:

- no autorizar;
- solo visualizar;
- visualizar y descargar.

La solicitud no habilita el archivo. Cada solicitud, decisión, visualización, descarga y revocación queda auditada. Al revocar, el documento vuelve a aparecer bloqueado y puede solicitarse nuevamente.

`Solo visualizar` significa que ONUr no ofrece un botón de descarga y genera el enlace sin disposición de descarga. Como el navegador debe recibir los bytes para mostrarlos, una aplicación web no puede impedir de manera absoluta que el usuario conserve una copia; la interfaz no promete una protección técnica imposible.

## Cuestionario físico

`public/resources/cuestionario-percepcion-onur.pdf` contiene 18 preguntas cerradas en tres dominios. Las opciones son Nada, Poco, Bastante, Mucho y No aplica. Está diseñado para impresión A4 y lectura sencilla.

La app permite:

- registrar momento inicial, final o seguimiento;
- transcribir respuestas completas o parciales;
- adjuntar una fotografía privada de la hoja;
- registrar valoración general de 0 a 10, caídas declaradas y uso de apoyo para caminar;
- calcular un total descriptivo con denominador según las respuestas aplicables;
- comparar inicial y final solo cuando ambos formularios v2 están completos, usando preguntas puntuables en ambos momentos;
- conservar los registros de la versión anterior sin mezclarlos en la comparación.

Es un instrumento propio no validado, sin puntos de corte. No es una escala diagnóstica, no determina causas y no genera recomendaciones médicas.

## Informe por ciclo

El informe reúne una instantánea de:

- período y estado del ciclo;
- sesiones asignadas, completas y parciales;
- tiempo de ejecución registrado;
- documentos asociados;
- evaluación inicial y final;
- hallazgos estadísticos ya aceptados o editados y seleccionados manualmente;
- resumen redactado por el profesional.

Cada guardado crea una versión nueva. El navegador permite imprimir o guardar como PDF. ONUr solo organiza y resume datos; el texto final debe ser revisado y firmado por el profesional.
