# Registro QR e imagen pública del taller — 25 de octubre de 2026

## Hallazgos

- `EnrollmentForm` sustituía todos los fallos de Supabase Auth por el mismo mensaje y obligaba a las cuentas existentes a depender del correo.
- `getPublicWorkshops` no devolvía una imagen y las tarjetas de la landing y del directorio solo dibujaban iconos. La foto privada de perfil añadida anteriormente no era una foto pública del taller.
- Consulta de solo lectura en producción: `https://motomanager.com.co/talleres/frankormotos` responde HTTP 200; Auth declara correo habilitado, `disable_signup=false` y `mailer_autoconfirm=false`. Esto no confirma que SMTP funcione ni identifica la causa del fallo de envío mostrado en la captura.
- Al recuperar acceso a `vmi3462336`, los logs de Auth confirmaron errores HTTP 500: `lookup supabase-mail ... server misbehaving`. No existe ese servicio en el Compose y las credenciales/remitente SMTP son valores de ejemplo. También se encontraron la URL principal en localhost y una allowlist sin el callback de producción.
- Se corrigieron de forma persistente en Dokploy y en la configuración activa `SITE_URL`, `ADDITIONAL_REDIRECT_URLS` y `API_EXTERNAL_URL`. Auth quedó saludable con las mismas claves JWT y confirmación de correo activa. La migración de imágenes ya fue aplicada en el Supabase real.

## Comportamiento nuevo

El envío se procesa mediante una Server Action con el cliente Auth público y cookies PKCE del navegador. Comprueba que el taller esté activo y recibiendo registros. El callback conserva el origen público validado por Next, incluso detrás de Dokploy. Los logs solo incluyen código y estado de error, nunca dirección, contraseña, enlace ni detalles del proveedor.

Los fallos de SMTP, configuración y límite de solicitudes muestran instrucciones específicas. El reenvío incluye una espera de 60 segundos, además de los límites que impone Auth. «Ya tengo cuenta → Usar contraseña» permite entrar sin solicitar correo y continuar la vinculación con una cuenta verificada. Una cuenta nueva sigue necesitando verificar su correo: no se crean usuarios confirmados mediante una clave administrativa.

«Mi perfil → Imagen pública del taller» permite a propietarios y administradores con correo verificado publicar, reemplazar o retirar una imagen. Se muestra en landing, directorio y bienvenida QR. Los archivos son JPG/PNG/WebP de máximo 2 MB, con MIME y firma comprobados. Las imágenes usan rutas únicas por taller. Las fotos privadas de perfil conservan su bucket y acceso originales.

## Aplicación y verificación

1. La migración `supabase/migrations/20261025155215_public_workshop_images.sql` ya se aplicó al Supabase del proyecto dentro de una transacción. Creó el bucket dedicado, su política restrictiva y una función autenticada. Se respaldaron el esquema y las configuraciones previas. No repetir su política `CREATE POLICY` en una instalación que ya la tenga.
2. Desplegar la aplicación desde esta rama con las variables existentes de Supabase.
3. Para habilitar el registro nuevo se necesita un SMTP real. Configurar en las variables del Compose de Supabase `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL` y `SMTP_SENDER_NAME`, con un remitente autorizado por el proveedor. El host y las credenciales actuales de ejemplo no pueden enviar correos. Mantener las credenciales fuera del repositorio y del chat.
4. Tras guardar el SMTP, recrear únicamente Auth y comprobar entrega con un buzón autorizado, límites y callback. El retorno ya permite `/auth/callback` en los dominios principal y www. No desactivar confirmaciones para sortear un fallo SMTP.
5. Probar registro nuevo y cuenta existente con un buzón autorizado, retorno PKCE al mismo navegador, vinculación y aviso a recepción. Publicar una imagen desde el perfil y comprobarla como visitante en landing, directorio y QR; sustituirla y retirarla.

No se enviaron correos a la dirección visible en la captura ni se crearon cuentas de prueba en producción.

## Validación local

- Suite TypeScript: 31 pruebas aprobadas, incluyendo retorno seguro, errores Auth, rutas por taller, MIME y rechazo de imágenes privadas/externas.
- Compilación de producción aprobada con variables ficticias locales. Lint aprobado con advertencias existentes y recomendación de optimización de imágenes; TypeScript sin errores.
- La migración y `tests/workshop-image-regression.sql` se ejecutaron en PostgreSQL embebido (PGlite) con esquemas mínimos de Auth/Storage. Pasaron aislamiento entre talleres, roles, correo verificado, existencia del objeto, preservación de ajustes, eliminación de referencia y bloqueo de escrituras/listado incluso con una política permisiva previa.
- Navegador Chromium sobre el build de producción con Auth/REST/Storage simulados en localhost: pasaron seis escenarios de QR móvil y error SMTP sin filtraciones, contraseña y cuenta verificada, publicación de imagen desde el perfil, límite y cuenta regresiva, solicitud PKCE con cookie y dirección normalizada, y foto en landing/directorio. No se enviaron mensajes reales; esta prueba no confirma entrega SMTP ni almacenamiento en producción.
- El fixture SQL no sustituye la prueba HTTP de Storage ni la entrega SMTP en producción. El runner Docker completo requiere Docker y no se ejecutó en este entorno.
- En el servidor real, `workshop-image-regression.sql` también pasó con todos los fixtures revertidos: permisos, aislamiento, objeto existente, preservación de ajustes y retirada de imagen. Auth quedó saludable; los permisos de la nueva función permiten a `authenticated` y deniegan a `anon`.
- Storage real: se subió una imagen de prueba sin asociarla a ningún taller, su descarga pública conservó los bytes exactos, una carga anónima fue denegada y se eliminaron los archivos de prueba.
