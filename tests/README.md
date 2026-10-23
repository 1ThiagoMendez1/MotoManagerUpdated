# Comprobaciones

Usar Node >=22 y ejecutar `npm ci` desde la raíz.

- `npm test`: validación de registro, permisos administrativos, retorno seguro, métricas y decodificación del QR del cartel rasterizado.
- `npm run test:db`: requiere Docker. Crea un contenedor PostgreSQL 17 sin red externa ni volúmenes persistentes, aplica los esquemas base y el fixture mínimo de stock, prueba las tres migraciones nuevas y los índices concurrentes; después destruye **solo ese contenedor**. Nunca consulta `DATABASE_URL`. No reproduce todos los cambios históricos de producción.
- `npm run typecheck`, `npm run lint`, `npm run build`: comprobaciones del código. El build necesita acceso a Google Fonts y Node >=22. Los avisos de lint heredados siguen siendo visibles.
- `npm run test:browser`: prueba integral opcional contra Auth/PostgREST y Mailpit **locales**, con la aplicación escuchando en `TEST_BASE_URL` (predeterminado: puerto 3001), Mailpit en `TEST_MAILPIT_URL` (puerto 54326) y un taller de prueba con slug `TEST_WORKSHOP_SLUG` (predeterminado `moto-centro`). Configurar SMTP local, PKCE y la URL permitida del callback. Necesita Chromium de Playwright (`npx playwright install chromium`) o `TEST_CHROMIUM_PATH`. El ensayo se ejecutó con `/usr/bin/chromium`.

El test del navegador crea una cuenta ficticia `@example.test`, recibe el enlace únicamente en Mailpit y confirma el registro y la denegación de acceso administrativo. No acepta destinos externos. El taller debe estar activo y tener `settings.customer_enrollment_enabled=true`. Se necesitan las tablas base de organizaciones, perfiles y clientes, las tres migraciones nuevas y un servicio Auth real; una respuesta HTTP simulada no valida este flujo. Este ensayo no cubre Storage, Realtime, cobros ni envíos reales. Las credenciales de los servicios locales se generan fuera del repositorio y no deben imprimirse ni reutilizarse en producción.

Para staging, seguir [la revisión y el orden de despliegue](../docs/production-review-v6.8.0.md). No usar estos scripts para enviar correos a clientes ni para reinicializar una base existente.
