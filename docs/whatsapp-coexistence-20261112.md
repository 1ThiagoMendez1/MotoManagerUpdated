# WhatsApp propio por taller: implementación y activación

## Estado de entrega

Implementación en rama de revisión, apagada por defecto. No se ha conectado un
número real ni se ha desplegado esta versión a producción. Las pruebas con Graph
son simuladas; falta un piloto autorizado con Meta y un número de WhatsApp Business.

La app elegida y autorizada por Santiago es `fronterasexpress`, ID
`1304241294974266`, del portfolio `FronterasExpress` (`956225080387236`), propiedad
de Mivra. El panel observado el 12 de noviembre de 2026 indicaba negocio **No
verificado**, app **Sin publicar** y revisión **No enviada**. La configuración
`1418771206670413` es de medición y no se debe usar para este registro.

## Comportamiento implementado

- Administración → WhatsApp del taller, para propietarios y administradores con
  permiso al módulo. El taller conserva su aplicación móvil WhatsApp Business.
- Embedded Signup v4: configuración nueva con producto Cloud API y
  `featureType=whatsapp_business_app_onboarding`. No se usa el antiguo
  `sessionInfoVersion=3`. Se espera el evento de coexistencia y el código OAuth.
- Nonce de diez minutos, cookie HttpOnly/Secure, validación del origen, usuario y
  taller derivados de la sesión y consumo atómico único del nonce.
- Canje de código y comprobación de app, permisos, vencimiento y pertenencia del
  número al WABA desde el servidor. Se exige `is_on_biz_app=true` y
  `platform_type=CLOUD_API`. **Nunca** se llama `/register` ni `/deregister`.
- Un WABA y un número por taller en esta primera versión. No se admite conectar
  el WABA o el número central de MotoManager. Los identificadores son únicos y
  no pueden apropiarse desde otro taller.
- Tokens, eventos e historial cifrados con AES-256-GCM y AAD del taller. Tablas en
  `motomanager_private`, RLS sin acceso para navegador, RPC solo `service_role`.
- Suscripción con callback alterno por WABA. Solicitudes de sincronización de
  contactos e historial inmediatas y registradas antes de su envío. No se repiten
  las solicitudes de sincronización de un solo uso tras un timeout incierto.
- Webhook con validación HMAC sobre el cuerpo original, persistencia antes del
  ACK, deduplicación, revocaciones y progreso monotónico. Guarda contactos en los
  eventos cifrados; muestra texto, referencias a medios e historial paginado en
  conversaciones recientes. No descarga medios ni ofrece un editor de respuestas.
- Plantillas propias versionadas en es_CO para órdenes, cotizaciones, pagos y
  citas (Utility), y mantenimiento (Marketing). No hereda las plantillas del WABA
  central. Compara categoría, texto y componentes antes de aceptar una aprobación.
  La interfaz permite actualizar su estado y lo consulta mientras está abierta.
  Al enviar, se vuelven a comprobar las aprobaciones pendientes (máximo una vez
  por minuto), de modo que la activación no exige dejar abierta esa pantalla.
- El número queda activo al terminar el historial (o autorizar no compartirlo)
  y aprobar las cuatro plantillas transaccionales. Un recordatorio requiere su
  propia aprobación de Marketing. Meta puede rechazar o reclasificar plantillas.
- Los avisos operativos existentes reciben un ID de taller explícito, incluido el
  webhook de Wompi. Se conserva la cuota existente. Si hay conexión propia,
  cualquier fallo bloquea el envío: no cambia al número central ni a Evolution.
  Los talleres sin conexión siguen con el remitente actual. Credenciales, códigos
  de acceso, bienvenida y avisos internos de plataforma siguen centralizados.
- Pausar envíos detiene el remitente propio; un evento tardío no lo reactiva.
  Cambiar de número limpia su bandeja anterior; reconectar el mismo conserva los
  mensajes. No se desconecta automáticamente la cuenta del teléfono del cliente.

## Configuración pendiente en Meta

1. Completar la verificación legal del portfolio con los datos reales de Mivra y
   el alta como Tech Provider. No basta un token de usuario de sistema vigente.
2. Crear **MotoManager WhatsApp** en Facebook Login for Business → Configurations.
   Seleccionar **Embedded Signup** y producto **Cloud API** para obtener v4,
   Business Integration System User token y los permisos WhatsApp de gestión y
   mensajería. Conservar el ID nuevo. No solicitar Ads, email o catálogos si no se
   van a utilizar. Revisar los permisos automáticamente seleccionados por Meta.
3. Configurar HTTPS, JavaScript SDK, dominios permitidos y URI OAuth exacta de la
   pantalla donde se ejecutará: `https://motomanager.app/dashboard/whatsapp`.
   Verificar el dominio real de producción antes de cargar esta configuración.
   Para subdominios de talleres, autorizar sus URLs explícitamente o centralizar
   este registro en el dominio canónico. No asumir que un wildcard está permitido.
4. Suscribir la app a `messages`, `history`, `smb_app_state_sync`,
   `smb_message_echoes` y `account_update`.
5. El callback por WABA **no** cubre `account_update` ni cambios de plantillas.
   Estos siguen llegando al callback predeterminado de fronterasexpress.
   Implementar allí un reenvío de los eventos de los WABA de MotoManager,
   conservando bytes originales y firma, y probar revocación. No reemplazar el
   callback de Fronteras Express ni afectar otros productos de Mivra.
6. Solicitar los accesos avanzados, entregar grabación del flujo y completar la
   revisión/publicación que Meta exija para clientes externos. Probar primero
   con usuarios/negocios autorizados para la fase de desarrollo.

## Variables privadas del servidor

No colocar App Secret, tokens o claves de cifrado en `NEXT_PUBLIC_*`, Git,
argumentos de build, logs ni mensajes de chat. El SDK recibe solo App ID,
Configuration ID y versión, desde una ruta autenticada y autorizada.

```dotenv
WHATSAPP_COEXISTENCE_MODE=off
META_APP_ID=1304241294974266
META_APP_SECRET=
META_EMBEDDED_SIGNUP_CONFIG_ID=
WHATSAPP_GRAPH_API_VERSION=v27.0
WHATSAPP_CONNECTION_ENCRYPTION_KEY=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_COEXISTENCE_CALLBACK_URL=https://motomanager.app/api/whatsapp/webhook
WHATSAPP_COEXISTENCE_WEBHOOKS_READY=false
WHATSAPP_COEXISTENCE_PILOT_ORGS=
```

Generar claves independientes: cifrado de 32 bytes en base64 y verify token de
32 bytes aleatorios o más. Guardarlas en el gestor privado del VPS y respaldar
la clave de cifrado: cambiarla sin migrar los registros impide descifrarlos.
App Secret y Configuration ID aún no estaban en los archivos de entorno de
MotoManager inspeccionados durante esta implementación.

`WEBHOOKS_READY=true` es una confirmación operativa: establecerla solo después
de verificar el callback alterno y el reenvío de `account_update`. `pilot` exige
una lista de UUID de talleres en `PILOT_ORGS`; `live` permite el registro general.
`off` impide nuevas conexiones y detiene los números propios ya registrados.

## Validación y despliegue

Ejecutar primero la migración aditiva
`supabase/migrations/20261112043328_whatsapp_coexistence.sql` sobre una copia
privada, verificar roles/permisos y aplicar el mismo archivo en producción antes
de desplegar el código: los remitentes consultan la nueva tabla incluso si el
registro de números está apagado. No resetear la base de datos de clientes.

Pruebas reproducibles:

```sh
npm run typecheck
node --import tsx --test tests/whatsapp-coexistence*.test.ts
node --import tsx --test --test-concurrency=2 tests/*.test.ts
```

Antes de activar `live`, completar un piloto extremo a extremo: popup real v4,
canje, número correcto, webhook firmado, sincronización final o declinada,
plantillas aprobadas, método de pago del cliente en WhatsApp Manager, un envío
a un destinatario expresamente autorizado, estado de entrega y copia móvil.
Probar además pausa, revocación desde el móvil y aislamiento entre dos talleres.

Validación automatizada: compilación Next.js y comprobación de tipos correctas,
14 pruebas nuevas y 209 pruebas de regresión correctas (2 omitidas). Incluye un
flujo de servidor completo con HTTP simulado y prohibición de destinos externos.
La comprobación visual con Chromium local quedó bloqueada por `socket() EPERM`;
la sesión de Desktop Commander dejó de responder antes de probar en el VPS.
No se considera validado el piloto real ni la interfaz en un navegador.

Pendientes operativos externos: verificación, App Review, nueva configuración,
App Secret, callback predeterminado/relay y piloto. No anunciar la integración
como disponible a clientes antes de completar esas comprobaciones.

## Fuentes primarias consultadas

- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-customers-as-a-tech-provider
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/override
