# Registro QR e imagen pública del taller — 25 de octubre de 2026

## Hallazgos

- `EnrollmentForm` sustituía todos los fallos de Supabase Auth por el mismo mensaje y obligaba a las cuentas existentes a depender del correo.
- `getPublicWorkshops` no devolvía una imagen y las tarjetas de la landing y del directorio solo dibujaban iconos. La foto privada de perfil añadida anteriormente no era una foto pública del taller.
- Consulta de solo lectura en producción: `https://motomanager.com.co/talleres/frankormotos` responde HTTP 200; Auth declara correo habilitado, `disable_signup=false` y `mailer_autoconfirm=false`. Esto no confirma que SMTP funcione ni identifica la causa del fallo de envío mostrado en la captura.
- El VPS `vmi3462336` figuraba offline en Desktop Commander durante la revisión. No se leyeron sus logs, no se cambió su configuración SMTP y no se aplicó la migración en producción.

## Comportamiento nuevo

El envío se procesa mediante una Server Action con el cliente Auth público y cookies PKCE del navegador. Comprueba que el taller esté activo y recibiendo registros. El callback conserva el origen público validado por Next, incluso detrás de Dokploy. Los logs solo incluyen código y estado de error, nunca dirección, contraseña, enlace ni detalles del proveedor.

Los fallos de SMTP, configuración y límite de solicitudes muestran instrucciones específicas. El reenvío incluye una espera de 60 segundos, además de los límites que impone Auth. «Ya tengo cuenta → Usar contraseña» permite entrar sin solicitar correo y continuar la vinculación con una cuenta verificada. Una cuenta nueva sigue necesitando verificar su correo: no se crean usuarios confirmados mediante una clave administrativa.

«Mi perfil → Imagen pública del taller» permite a propietarios y administradores con correo verificado publicar, reemplazar o retirar una imagen. Se muestra en landing, directorio y bienvenida QR. Los archivos son JPG/PNG/WebP de máximo 2 MB, con MIME y firma comprobados. Las imágenes usan rutas únicas por taller. Las fotos privadas de perfil conservan su bucket y acceso originales.

## Despliegue pendiente

1. Aplicar `supabase/migrations/20261025155215_public_workshop_images.sql` al Supabase del proyecto mediante su procedimiento normal de migraciones. Crea únicamente el bucket dedicado, su política restrictiva y una función de actualización autenticada; no modifica clientes ni órdenes.
2. Desplegar la aplicación desde esta rama con las variables existentes de Supabase.
3. En el VPS, reproducir una solicitud autorizada de prueba y correlacionar el código de `[workshop-email] Delivery failed` con los logs del contenedor Auth. Identificar el error concreto antes de cambiar credenciales o límites.
4. Comprobar SMTP real: host, puerto, credenciales, remitente permitido, entrega, límites y la URL pública/allowlist de `/auth/callback` con el retorno al taller. Configurarlo en Supabase Auth; el código de la aplicación no instala ni configura un servidor de correo. No desactivar confirmaciones para sortear un fallo SMTP.
5. Probar registro nuevo y cuenta existente con un buzón autorizado, retorno PKCE al mismo navegador, vinculación y aviso a recepción. Publicar una imagen desde el perfil y comprobarla como visitante en landing, directorio y QR; sustituirla y retirarla.

No se enviaron correos a la dirección visible en la captura ni se crearon cuentas de prueba en producción.

## Validación local

- Suite TypeScript: 31 pruebas aprobadas, incluyendo retorno seguro, errores Auth, rutas por taller, MIME y rechazo de imágenes privadas/externas.
- Compilación de producción aprobada con variables ficticias locales. Lint aprobado con advertencias existentes y recomendación de optimización de imágenes; TypeScript sin errores.
- La migración y `tests/workshop-image-regression.sql` se ejecutaron en PostgreSQL embebido (PGlite) con esquemas mínimos de Auth/Storage. Pasaron aislamiento entre talleres, roles, correo verificado, existencia del objeto, preservación de ajustes, eliminación de referencia y bloqueo de escrituras/listado incluso con una política permisiva previa.
- Navegador Chromium sobre el build de producción con Auth/REST/Storage simulados en localhost: pasaron seis escenarios de QR móvil y error SMTP sin filtraciones, contraseña y cuenta verificada, publicación de imagen desde el perfil, límite y cuenta regresiva, solicitud PKCE con cookie y dirección normalizada, y foto en landing/directorio. No se enviaron mensajes reales; esta prueba no confirma entrega SMTP ni almacenamiento en producción.
- El fixture SQL no sustituye la prueba HTTP de Storage ni la entrega SMTP en producción. El runner Docker completo requiere Docker y no se ejecutó en este entorno.
