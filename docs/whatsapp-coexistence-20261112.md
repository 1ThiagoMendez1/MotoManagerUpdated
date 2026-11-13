# WhatsApp propio por taller: implementación y activación

## Estado de entrega

Implementación apagada por defecto y preparada para un despliegue controlado.
Las credenciales de la app ya se validaron con Meta. Las pruebas de conexión de
números son simuladas: falta un piloto autorizado con un número de WhatsApp Business.

La app actual de MotoManager es **Mivra**, ID `2239085550357868`, con configuración
Embedded Signup `2070411636831636` y portfolio `4474441259475517`, según las
capturas suministradas por Santiago. El App Secret se introdujo directamente en
el VPS y Meta confirmó por API que pertenece a esa app. No se utiliza la app
anterior de Fronteras Express ni su configuración de medición.

El callback publicado y verificado es
`https://motomanager.com.co/api/whatsapp/webhook`. Conserva la validación HMAC de
bytes originales, el límite de 5 MiB y la bandeja global cifrada de PR27, y añade
el procesamiento idempotente por taller antes del ACK. No basta almacenar el
recibo para activar una conexión: debe terminar su sincronización y aprobar sus
plantillas. No se ha vinculado un número real ni se han enviado mensajes reales.

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
   pantalla donde se ejecutará: `https://motomanager.com.co/dashboard/whatsapp`.
   Verificar el dominio real de producción antes de cargar esta configuración.
   Para subdominios de talleres, autorizar sus URLs explícitamente o centralizar
   este registro en el dominio canónico. No asumir que un wildcard está permitido.
4. Suscribir la app a `messages`, `history`, `smb_app_state_sync`,
   `smb_message_echoes` y `account_update`.
5. Suscribir los eventos de coexistencia al callback predeterminado de esta
   app Mivra. Esta app es distinta de Fronteras Express; conservar los callbacks
   de otros proyectos. La suscripción por WABA confirma explícitamente el
   callback de MotoManager para esa conexión.
6. Solicitar los accesos avanzados, entregar grabación del flujo y completar la
   revisión/publicación que Meta exija para clientes externos. Probar primero
   con usuarios/negocios autorizados para la fase de desarrollo.

## Variables privadas del servidor

No colocar App Secret, tokens o claves de cifrado en `NEXT_PUBLIC_*`, Git,
argumentos de build, logs ni mensajes de chat. El SDK recibe solo App ID,
Configuration ID y versión, desde una ruta autenticada y autorizada.

```dotenv
WHATSAPP_COEXISTENCE_MODE=off
META_APP_ID=2239085550357868
META_APP_SECRET=
META_EMBEDDED_SIGNUP_CONFIG_ID=2070411636831636
WHATSAPP_GRAPH_API_VERSION=v27.0
WHATSAPP_CONNECTION_ENCRYPTION_KEY=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_COEXISTENCE_CALLBACK_URL=https://motomanager.com.co/api/whatsapp/webhook
WHATSAPP_COEXISTENCE_WEBHOOKS_READY=false
WHATSAPP_COEXISTENCE_PILOT_ORGS=
```

Generar claves independientes: cifrado de 32 bytes en base64 y verify token de
32 bytes aleatorios o más. Guardarlas en el gestor privado del VPS y respaldar
la clave de cifrado: cambiarla sin migrar los registros impide descifrarlos.
App Secret y Configuration ID se guardaron en el entorno privado del VPS. La
clave de cifrado de conexiones es distinta de la clave de la bandeja global.

`WEBHOOKS_READY=true` es una confirmación operativa: establecerla solo después
de verificar firma, suscripciones, persistencia y procesamiento de eventos. `pilot` exige
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

## Despliegue inicial controlado

El registro general permanece apagado hasta completar la revisión de Meta y un
piloto autorizado. `pilot` solo habilita los UUID de talleres explícitos del
entorno, sin modificar los demás clientes. Antes del piloto, autorizar el SDK
JavaScript y el dominio canónico `https://motomanager.com.co` en Facebook Login
for Business, además de los requisitos de permisos de Meta. Desde un subdominio
se abre el panel canónico para no exigir una lista distinta por cada taller;
si la sesión de ese dominio no existe, se requiere iniciar sesión allí.

El SDK no se carga ni se prepara un nonce en los subdominios de talleres. Los
inicios y finalizaciones solo se aceptan desde el origen canónico configurado.
El secreto de la app, los tokens y ambas claves de cifrado permanecen privados.
