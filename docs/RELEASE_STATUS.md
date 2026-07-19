# Estado de release · ONUr 0.1.0-beta.15

Fecha de corte: 18 de julio de 2026.

## Resultado

ONUr dispone de un entorno privado operativo para piloto clínico con persistencia en Supabase. El frontend publicado utiliza autenticación real y deja de usar `localStorage` como fuente de verdad para pacientes, sesiones, documentos y evolución.

El esquema remoto está actualizado, las funciones de servidor están desplegadas y la cuenta profesional fue preparada. El smoke test integral fue completado correctamente y eliminó todos los pacientes, identidades y archivos sintéticos usados durante la verificación.

## Verificado

- autenticación profesional y recuperación de contraseña;
- alta y edición persistente de pacientes;
- acceso paciente con CI temporal y cambio obligatorio a PIN;
- aislamiento RLS entre profesionales y pacientes;
- ciclos, sesiones domiciliarias y presenciales;
- documentos clínicos en Storage privado;
- permisos de vista, descarga y revocación;
- posturografía, vHIT, extracción local y revisión profesional;
- finalización inmutable de estudios con SHA-256;
- auditoría de eventos críticos sin copiar contenido clínico;
- PWA instalable y publicación privada por HTTPS;
- 29 archivos de prueba y 116 pruebas automatizadas aprobadas.

## Alcance operativo

Esta versión puede utilizarse como piloto clínico real por el profesional configurado. Los datos nuevos se conservan en la base remota y no dependen del navegador o dispositivo utilizado.

ONUr organiza ejercicios e información. No diagnostica, no prescribe y no reemplaza la valoración de un profesional habilitado.

## Gestión continua necesaria

- revisar y probar periódicamente las copias de seguridad;
- definir política de retención y eliminación de historias clínicas;
- mantener avisos de privacidad y consentimientos aplicables en Uruguay;
- documentar respuesta a incidentes y responsables de acceso;
- validar físicamente audio, pantalla completa, VR Box, HDMI y Quest antes de cada modalidad de uso;
- revisar logs, dependencias, RLS y funciones de servidor en cada release.

El desarrollo continuará de forma incremental: los fallos observados durante el uso deben registrarse, priorizarse y corregirse sin perder la trazabilidad de los datos clínicos.
