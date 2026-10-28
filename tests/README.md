# Comprobaciones

Usar Node >=22 y ejecutar `npm ci` desde la raíz.

- `npm test`: validación de registro, permisos administrativos, retorno seguro, métricas y decodificación del QR del cartel rasterizado.
- `npm run test:cache`: requiere Docker. Ejecuta Redis temporal, comprueba caché compartida entre dos instancias, invalidación de escrituras y transporte interno sin cambiar la clave pública de sesión. El puerto temporal solo escucha en loopback y se destruye su propio contenedor al terminar. Las mediciones usan una fuente con 30 ms simulados, sin representar producción. `npm test` incluye además aislamiento por usuario/taller/permisos, TTL, fallos, expulsiones y cargas concurrentes.
- `npm run test:navigation`: integración opcional con una app local en modo producción (`TEST_BASE_URL`, puerto 3007 predeterminado). Requiere Auth/PostgREST/Redis locales, `TEST_OWNER_EMAIL` ficticio `@example.test`, `TEST_OWNER_PASSWORD`, `TEST_WORKSHOP_SLUG` y al menos una moto. Usar `TEST_CHROMIUM_PATH` si Chromium está instalado fuera de Playwright. Comprueba ocho apartados, ausencia de errores de hidratación con navegador UTC/servidor Bogotá, carga diferida de opciones/historial, exportación y denegación de diagnósticos al dueño. Sus tiempos incluyen la espera `networkidle` del navegador y no miden producción. Nunca usar credenciales reales ni apuntar los servicios locales a datos de clientes.
- `npm run test:db`: requiere Docker. Crea un contenedor PostgreSQL 17 sin red externa ni volúmenes persistentes, aplica los esquemas base y el fixture mínimo de stock, prueba las tres migraciones nuevas y los índices concurrentes; después destruye **solo ese contenedor**. Nunca consulta `DATABASE_URL`. No reproduce todos los cambios históricos de producción.
- `npm run typecheck`, `npm run lint`, `npm run build`: comprobaciones del código. El build necesita acceso a Google Fonts y Node >=22. Los avisos de lint heredados siguen siendo visibles.
- `npm run test:browser`: prueba integral opcional contra Auth/PostgREST y Mailpit **locales**, con la aplicación escuchando en `TEST_BASE_URL` (predeterminado: puerto 3001), Mailpit en `TEST_MAILPIT_URL` (puerto 54326) y un taller de prueba con slug `TEST_WORKSHOP_SLUG` (predeterminado `moto-centro`). Configurar SMTP local, PKCE y la URL permitida del callback. Necesita Chromium de Playwright (`npx playwright install chromium`) o `TEST_CHROMIUM_PATH`. El ensayo se ejecutó con `/usr/bin/chromium`.

El test del navegador crea una cuenta ficticia `@example.test`, recibe el enlace únicamente en Mailpit y confirma el registro y la denegación de acceso administrativo. No acepta destinos externos. El taller debe estar activo y tener `settings.customer_enrollment_enabled=true`. Se necesitan las tablas base de organizaciones, perfiles y clientes, las tres migraciones nuevas y un servicio Auth real; una respuesta HTTP simulada no valida este flujo. Este ensayo no cubre Storage, Realtime, cobros ni envíos reales. Las credenciales de los servicios locales se generan fuera del repositorio y no deben imprimirse ni reutilizarse en producción.

Para staging, seguir [la revisión y el orden de despliegue](../docs/production-review-v6.8.0.md). No usar estos scripts para enviar correos a clientes ni para reinicializar una base existente.

## Nuevos controles de seguridad y horarios

- Las pruebas unitarias cubren formato de horarios independiente por taller, parámetros WhatsApp, OTP criptográfico y ausencia de valores por defecto.
- `npm run test:db` también aplica las migraciones de horarios, OTP, perfil atómico y cuota WhatsApp (`20261023200000` a `20261023203000`) sobre el contenedor descartable. Prueba aislamiento de horarios, preservación de ajustes, límites de intentos, no reutilización OTP y que el contador del mes no borre preferencias de otros talleres.
- Las pruebas aisladas no envían WhatsApp ni confirman la aprobación de la nueva plantilla Meta. Ver `docs/whatsapp-business-hours.md`.
- Antes de activar OTP renovado, configurar `MOBILE_OTP_PEPPER` con al menos 32 caracteres aleatorios protegidos y verificar un flujo de inicio de sesión móvil real en staging.

## Registro e imagen pública del taller

- `workshop-access.test.ts` comprueba mensajes de Auth, normalización del correo, retorno PKCE, aislamiento de rutas de imágenes y rechazo de archivos SVG/MIME falsificados.
- `test:db` aplica `20261025155215_public_workshop_images.sql` con una tabla mínima de metadatos Storage y ejecuta `workshop-image-regression.sql`. Valida permisos reales de PostgreSQL, aislamiento entre talleres, conservación de ajustes y una política restrictiva que bloquea escrituras/listado desde clientes incluso frente a una política permisiva previa. Este fixture no valida el servidor HTTP de Storage ni SMTP.
- En entornos donde el socket IPC de la CLI `tsx` esté restringido, ejecutar la misma suite con `node --import tsx --test tests/*.test.ts`.
