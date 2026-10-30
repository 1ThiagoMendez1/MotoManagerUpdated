# Registro de clientes por QR con verificación WhatsApp — 25/10/2026

## Objetivo y alcance

El formulario público /talleres/[slug] ofrece como opción principal la verificación
de un número de Colombia por código de seis dígitos enviado por **Meta WhatsApp Cloud API**.
No solicita ni envía correo electrónico a un cliente nuevo; también conserva la
opción de iniciar sesión con **correo y contraseña existente** para no perder vínculos
históricos. Los registros de clientes siguen creando una solicitud pendiente para
recepción. No se asigna una moto ni se da acceso a una ficha por introducir una placa.

Para un número verificado se usa una cuenta técnica:
`57XXXXXXXXXX@clientes.motomanager.com.co`. No es una dirección de contacto;
solo permite compatibilidad con el esquema de Supabase Auth y el RPC actual
que exige `email_confirmed_at`. Solo el servidor puede crearla, después de
consumir correctamente el código. El usuario no recibe nunca la contraseña
temporal. Las cuentas con correo real NO se vinculan automáticamente por un
teléfono que coincida: deben acceder con su contraseña habitual.

## Crear la plantilla en Meta WhatsApp Manager

1. Ingresa a **WhatsApp Manager → Plantillas de mensajes → Crear plantilla**,
   dentro de la cuenta empresarial (WABA) que contiene el número emisor usado por
   `WHATSAPP_PHONE_NUMBER_ID`.
2. Elige la categoría **Autenticación** y el modelo de **Código de un solo uso**.
   Para el botón elige **Copiar código** (no autocompletar en una app nativa).
3. Nombre EXACTO: `codigo_registro_qr`.
4. Idioma EXACTO: **Español (Colombia), es_CO**, si está disponible para la WABA.
   No sustituyas silenciosamente por `es` o `es_ES`: el código pide `es_CO`.
5. Meta genera el texto obligatorio de verificación con **una variable** para el
   código. Habilita la recomendación de seguridad y la caducidad **5 minutos**.
   No uses plantilla de marketing, botones de enlace personalizados ni encabezados.
6. Envía a revisión; comprueba estado **APPROVED** y el mismo número/WABA antes
   de activar el flujo. El servidor envía el código en `body {{1}}` y en el
   parámetro del botón **Copiar código**.

La plantilla de aviso del estado reparado, previamente renombrada en Meta,
mantiene nombre EXACTO `actualizacion_estado_reparado`, idioma `es_CO`
y **8 parámetros de cuerpo, sin encabezado**. El código antiguo
`estado_reparado` se transforma al nuevo nombre, incluso si llega desde
`WHATSAPP_READY_DYNAMIC_TEMPLATE`. Si el cuerpo u orden de parámetros
cambió en Meta, debes alinear los 8 valores antes de enviar.

## Requisitos del servidor

- `WHATSAPP_API_TOKEN`: token de Meta con permisos para enviar mensajes.
- `WHATSAPP_PHONE_NUMBER_ID`: ID del número emisor en la misma WABA.
- `MOBILE_OTP_PEPPER`: opcional pero recomendado para separar los OTP del QR.
  Si no está definido, el backend deriva un secreto mediante HMAC-SHA256 a partir de
  `SUPABASE_SERVICE_ROLE_KEY` con etiqueta exclusiva del QR. No se imprime, envía
  al navegador ni guarda en GitHub. Cambiar la clave de servicio invalida los
  códigos de QR pendientes (expiran en cinco minutos). Un valor configurado
  de menos de 32 caracteres no se acepta.
- Opcional: `WHATSAPP_GRAPH_API_VERSION`, por defecto `v23.0`.
- Supabase: clave service-role configurada y sesiones SSR habilitadas.
- Aplicar PRIMERO la migración
  `supabase/migrations/20261025183000_workshop_qr_whatsapp_otp.sql`
  con respaldo. Añade tabla y tres funciones RPC solo para `service_role`.
- Después desplegar esta rama y verificar que el servicio reconoce la plantilla
  y que el código de Meta se recibe en un **número propio autorizado**.

**No desactivar la seguridad de Supabase Auth ni añadir claves a variables
NEXT_PUBLIC.** El correo SMTP deja de ser necesario para el alta QR nueva,
pero otras funcionalidades heredadas podrían seguir utilizándolo.

## Seguridad y operación

- Cada código vence en cinco minutos, se consume una única vez y admite
  cinco intentos como máximo; reenvío no antes de 60 segundos y como máximo
  cinco solicitudes en 24 horas por teléfono y taller.
- La tabla de desafíos carece de acceso para `anon` y `authenticated`;
  guarda HMAC, jamás el código en claro.
- El alta nueva solo crea la cuenta después de comprobar el código. Una
  cuenta real de email nunca se reasigna por coincidencia de teléfono.
- En `enrollCustomer` se impide que la cuenta técnica use un número de
  contacto diferente del que verificó, y se preservan las reglas del taller.
- **Antes de producción**: añadir protección antiabuso por IP/ASN en el
  reverse proxy/CDN (rate limiting y desafío antibots) para impedir
  solicitudes distribuidas a números distintos; las cuotas por teléfono
  NO sustituyen a esa protección.
- Una respuesta HTTP satisfactoria de Meta solo significa aceptación:
  la entrega real debe verificarse mediante webhooks/estados.
- No ejecutar pruebas con números reales de clientes sin consentimiento.
- El personal sigue recibiendo **la notificación interna de MotoManager**
  por la solicitud QR; no se envía un mensaje automático adicional al
  WhatsApp del dueño.

## Prueba manual de extremo a extremo (pendiente de un entorno autorizado)

1. Crear/aprobar `codigo_registro_qr` y aplicar la migración SQL.
2. Activar QR en un taller de pruebas, pedir código con celular propio,
   validar bloqueo antes de 60 s y caducidad tras 5 min.
3. Probar cinco códigos incorrectos; no debe crearse ni abrirse una sesión.
4. Verificar código correcto; comprobar sesión, consentimiento y creación
   de la solicitud de recepción, sin asignación automática de moto.
5. Repetir código consumido: debe rechazarse. Entrar de nuevo con OTP
   y verificar que se reutiliza la misma cuenta técnica.
6. Acceder con una cuenta real existente por contraseña y validar que
   sus motos y órdenes sigan ligadas a su identidad original.
7. Comprobar notificación interna, denegación entre talleres y envío
   real del estado Reparado únicamente con consentimiento.

Ninguna migración, despliegue, mensaje real ni prueba de extremo a extremo
se efectúa automáticamente al preparar este cambio en GitHub.
