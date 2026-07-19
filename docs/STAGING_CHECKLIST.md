# Checklist de staging

Este checklist debe completarse antes de cargar datos reales o iniciar un piloto cerrado.

## Infraestructura

- [ ] Elegir región y condiciones contractuales adecuadas para datos de salud.
- [ ] Crear un proyecto Supabase exclusivo de staging.
- [ ] Aplicar todas las migraciones en una base vacía sin errores.
- [ ] Verificar respaldo y realizar una restauración de prueba.
- [ ] Mantener deshabilitado el registro público.
- [ ] Autorizar `https://fedeshindiaz.github.io/onur-beta/restablecer-clave`, probar recuperación profesional y decidir MFA.
- [ ] Configurar `PATIENT_AUTH_PEPPER` aleatorio y exclusivo del ambiente.
- [ ] Configurar `ALLOWED_ORIGIN` con el origen exacto de staging.
- [ ] Desplegar las cinco Edge Functions documentadas en el README.
- [ ] Ejecutar `npm run admin:create` y confirmar el único usuario con `app_metadata.role = professional`.

## Pruebas de permisos

- [ ] El profesional accede solamente a pacientes propios.
- [ ] Un segundo profesional de prueba no puede leer ni modificar pacientes ajenos.
- [ ] Un paciente activo accede únicamente a su perfil, asignaciones y ejecuciones.
- [ ] Un paciente no puede leer métricas, incidencias, sugerencias ni notas privadas.
- [ ] Un documento privado no puede abrirse desde la cuenta paciente.
- [ ] El paciente ve metadatos de documentos bloqueados, pero nunca la ruta de Storage.
- [ ] Solicitar acceso no permite abrir el documento antes de la aprobación.
- [ ] Aprobar `solo visualizar` no muestra botón de descarga en el portal.
- [ ] Aprobar `visualizar y descargar` habilita ambas acciones.
- [ ] Denegar conserva la solicitud y permite una nueva solicitud posterior.
- [ ] Con permiso `view`, el paciente visualiza pero no obtiene una descarga habilitada por la interfaz.
- [ ] Revocar el permiso invalida el acceso al documento.
- [ ] Desactivar la cuenta invalida una sesión paciente ya abierta.
- [ ] Reactivar la cuenta no modifica permisos históricos no revocados.
- [ ] El navegador nunca recibe `service_role`, CI, PIN ni `PATIENT_AUTH_PEPPER`.

## Importación estructurada

- [ ] El archivo original conserva hash, tamaño, MIME y ruta privada.
- [ ] La coma decimal se normaliza sin cambiar `raw_value`.
- [ ] `0`, `No registrado`, `No aplica` y `Desconocido` quedan diferenciados.
- [ ] La falta de unidad produce `DQ-002` y bloquea la comparación.
- [ ] Un porcentaje fuera de 0–100 queda en cuarentena sin autocorrección.
- [ ] Los posibles duplicados quedan en revisión y no se fusionan.
- [ ] Un estudio con bloqueos no puede marcarse interpretable.
- [ ] Un estudio finalizado no puede reemplazarse.
- [ ] Solo un estudio revisado, con métricas e importación confirmada, puede finalizarse.
- [ ] Finalizar guarda fecha, profesional, hash y evento de auditoría.
- [ ] Tras finalizar fallan actualizaciones y eliminaciones de estudio, métricas, incidencias e importación.
- [ ] Una escritura concurrente no puede modificar el contenido fuera del snapshot final.
- [ ] Las sugerencias solo usan métricas `ok` y reglas aprobadas.
- [ ] La comparación longitudinal bloquea protocolos, versiones o unidades incompatibles.
- [ ] Aceptar, editar o descartar deja revisión y auditoría.
- [ ] Ninguna sugerencia pendiente aparece en el portal paciente.

## Sesiones y reproductor

- [ ] La receta asignada permanece inmutable aunque cambie la plantilla.
- [ ] Pausar congela estímulo, tiempo y metrónomo.
- [ ] Omitir conserva motivo y continúa automáticamente.
- [ ] Reanudar reinicia el ejercicio interrumpido desde la primera vuelta.
- [ ] Los controles se ocultan y reaparecen con el primer toque sin pausar.
- [ ] Un corte temporal permite finalizar y sincroniza al recuperar conexión.
- [ ] Malestar 0–10 y dificultad 1–5 se guardan; entradas fuera de rango fallan.
- [ ] Los auto-reportes no disparan ramas, alertas clínicas ni recomendaciones automáticas.
- [ ] Pausas y descansos no aumentan el tiempo activo.
- [ ] Probar audio del metrónomo y su pausa en cada navegador objetivo.
- [ ] Probar VR Box en horizontal: aviso previo, pantalla completa, transición de 20 segundos, centrado binocular, finalización automática y retiro del visor.
- [ ] Probar Quest navegador; no presentar esa salida como WebXR inmersiva.
- [ ] La confirmación de uso se solicita por versión y queda auditada.
- [ ] Probar la matriz definida de teléfonos, navegadores y HDMI.

## Salida a piloto

- [ ] Revisar textos clínicos con un profesional habilitado distinto del autor.
- [ ] Revisar aviso de privacidad, consentimiento, retención e incidentes con asesoría local.
- [ ] Confirmar que los participantes entienden que ONUr no diagnostica ni prescribe.
- [ ] Documentar responsable de soporte y criterio para detener el piloto.
- [ ] No promocionar resultados clínicos ni eficacia sin validación adecuada.
