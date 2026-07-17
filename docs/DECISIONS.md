# Decisiones técnicas iniciales

Fecha: 16 de julio de 2026

## Frontend

Se utiliza React con Vite y TypeScript. Vite ofrece plantilla oficial React/TypeScript, compilación de producción y un servidor de desarrollo rápido.

Fuente: https://vite.dev/guide/

Tailwind se integra mediante el plugin oficial para Vite.

Fuente: https://tailwindcss.com/docs/installation/using-vite

## Backend

Supabase concentra Auth, PostgreSQL, Storage y Edge Functions. Auth emite JWT y se integra con las políticas RLS de PostgreSQL.

Fuentes:

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security

## PIN de cuatro dígitos

Supabase recomienda contraseñas más extensas. Como el requisito confirmado mantiene un PIN de cuatro dígitos, el PIN no se usa directamente como contraseña de Auth: una Edge Function lo transforma mediante HMAC y un `pepper` del servidor. Se agregan bloqueo, límite de intentos y errores genéricos.

Fuente: https://supabase.com/docs/guides/auth/password-security

Esta mitigación es una decisión de arquitectura de ONUr y debe validarse mediante una evaluación de seguridad antes del uso real.
