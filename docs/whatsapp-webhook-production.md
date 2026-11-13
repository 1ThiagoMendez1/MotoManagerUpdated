# Callback de WhatsApp de MotoManager

URL canónica: `https://motomanager.com.co/api/whatsapp/webhook`.

El GET devuelve `hub.challenge` como texto solamente si el modo y el token
coinciden. El token de verificación se genera en el VPS con 32 bytes aleatorios,
se conserva en `/opt/motomanager-production/node-production.env` y se introduce
igual en Meta. No es un token de acceso a la API.

Variables privadas de ejecución (no requieren reconstruir la imagen):

```dotenv
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_ENCRYPTION_KEY=
META_APP_ID=
META_APP_SECRET=
```

La clave de cifrado es de 32 bytes en base64 y debe conservarse para recuperar
eventos anteriores. El App Secret es el secreto real de la app seleccionada en
Meta → Configuración de la app → Básica. No se genera en MotoManager ni se pega
en Git/chat. Debe guardarse por un canal privado en el entorno del VPS. El App
ID identifica esa misma app; no asumir que una captura de otra app usa el ID de
fronterasexpress.

POST exige la firma HMAC-SHA256 de los bytes originales; limita los cuerpos a
5 MiB, cifra el evento con AES-256-GCM y lo guarda antes de responder 200. La
tabla privada `motomanager_private.whatsapp_webhook_receipts` no está disponible
para usuarios del navegador. Una entrega duplicada no crea otra fila. Los
recibos caducados se limpian en la siguiente inserción a los 30 días.

Sin App ID, App Secret o clave de cifrado válidos responde **503**, permitiendo
reintentos: verificar el GET no demuestra todavía recepción de mensajes reales.
Los tests usan secretos y eventos sintéticos; nunca envían mensajes a clientes.

Este cambio prepara la recepción y el almacenamiento. No activa conexiones de
talleres, respuestas, envío propio, sincronización de historial ni la interfaz
de coexistencia pendiente en PR24. Antes de activar esos flujos se debe consumir
esta bandeja de forma idempotente y con aislamiento por taller, o sustituir este
handler por el procesador de PR24 conservando el callback y el token.

Si se usa la app compartida de Fronteras Express, conservar cualquier callback
existente de sus otros servicios. Usar callback alterno por WABA y reenviar los
eventos globales necesarios sin alterar cuerpo/firma. No reemplazar callbacks
en Meta sin revisar las suscripciones actuales.

Pruebas: `node --import tsx --test tests/whatsapp-webhook*.test.ts`,
`npm run typecheck` y compilación Next.js. Aplicar primero la migración aditiva
`20261112234745_whatsapp_webhook_receipts.sql`.
