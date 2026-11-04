# Mi garaje: acceso recurrente para clientes de talleres

## Contrato funcional

- Registro inicial: QR del taller, código de WhatsApp, consentimiento de vinculación y llamada al RPC join_workshop_as_customer. Recepción confirma cada motocicleta; escribir una placa no establece propiedad.
- Acceso recurrente: https://motomanager.com.co/clientes, celular colombiano usado en el QR, código de autenticación Meta WhatsApp, sesión Supabase SSR y comprobación del vínculo con un taller activo.
- Acceso heredado: correo y contraseña, solo si existe vinculación en workshop_customer_accounts.
- Sin taller asociado: mostrar únicamente el acceso o un mensaje de registro pendiente; nunca información privada.
- Perfil vinculado: foto propia, talleres, motos confirmadas, historial de órdenes, cotizaciones, citas y reseñas verificadas. No inventar puntos, promociones ni descuentos.
- Enlaces internos: moto por UUID en ?moto=<id>, placa solo informativa. Los enlaces ?auth=<placa> heredados requieren autorización del par de taller y cliente.

## Seguridad

- El portal no crea usuarios ni llama al RPC de inscripción. Solo admite cuentas técnicas 57XXXXXXXXXX@clientes.motomanager.com.co ya confirmadas y vinculadas.
- Elegibilidad basada en workshop_customer_accounts y una organización activa, no en metadatos del usuario ni en la placa.
- Respuesta genérica al solicitar OTP para evitar enumerar cuentas.
- Reutiliza workshop_qr_otp_challenges con scope portal-clientes: código HMAC de cinco minutos, consumo único, máximo cinco intentos, un envío/minuto y cinco solicitudes/día por celular.
- Solo rota contraseña temporal de la cuenta técnica previamente vinculada; nunca de cuentas de correo real.
- Los datos se limitan a pares organization_id/customer_id autorizados, con órdenes/citas por taller y moto.

## Despliegue y aceptación

1. Comprobar plantilla Meta de autenticación codigo_registro_qr APPROVED, WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID y secreto QR.
2. Comprobar migración 20261025183000_workshop_qr_whatsapp_otp.sql. No hace falta una tabla adicional.
3. Limitar solicitudes OTP por IP/ASN en el proxy y exigir desafío antibots. Las cuotas por teléfono no bastan contra abuso distribuido.
4. Probar en staging usando solo celulares propios/autorizados: no registrado, vinculado, código incorrecto/usado/caducado, reenvíos, talleres inactivos, cuentas de correo antiguas, varios talleres y motos pendientes.
5. Verificar negación entre talleres para ?moto=uuid y ?auth=placa, así como citas, historial y reseñas.
6. Verificar entrega del mensaje mediante estados/webhooks y navegación desde menú y QR.

No desplegar a producción sin build, pruebas de seguridad y entrega real de OTP verificadas.

## Revalidación técnica — 4 de noviembre de 2026

- Sin alterar producción, la rama se sincronizó con la versión actual del registro gratuito (merge commit `7ed571bc51c997b87daeb70feebc1456a3632297`). No se cambió la base de usuarios ni la inscripción QR.
- En una copia limpia del VPS: `npm ci --legacy-peer-deps --no-fund --no-audit` terminó con código 0; `npm test` pasó **112/112**; `npm run typecheck` terminó en 0 y `next build` terminó en 0.
- Se corrigió una carrera de cotización en `submitQuoteResponse`: una actualización condicional y atómica sobre `quote_status`, con verificación de la fila modificada, impide procesar por segunda vez la misma respuesta y descontar inventario dos veces. El visor ya no muestra volcados privados de errores de PostgREST.
- Prueba local aislada de rutas con Supabase ficticio (sin consultar datos reales): `/clientes` HTTP 200, `/prueba-gratis` HTTP 200, `/api/mobile/portal-data` sin token HTTP 401, `/cotizacion/<uuid-de-prueba>` sin sesión HTTP 404.
- Funciones OTP inspeccionadas en la base existente: RLS habilitado; ejecución reservada a `service_role`; transacción revertida probó emisión, rechazo de código erróneo, un consumo válido, rechazo de repetición y bloqueo de reenvío. No se enviaron mensajes ni se conservaron registros de prueba.

### Condiciones pendientes para dar la funcionalidad por lista para publicar

1. **Meta real**: el token y el número emisor responden a las consultas de lectura y el token declara permisos WhatsApp; sin embargo, el valor de `WHATSAPP_BUSINESS_ACCOUNT_ID` no admite los endpoints `message_templates` y `phone_numbers` (Meta código 100, campo inexistente). Confirmar el ID de WABA en WhatsApp Manager y que `codigo_registro_qr` está APPROVED en `es_CO`. No cambiar la configuración a ciegas.
2. **Entrega OTP**: en staging, con un número de prueba propio/autorizado, solicitar un único código y verificar la recepción real / webhook; probar expiración, reenvío, intento incorrecto y acceso válido. No enviar pruebas a números de clientes.
3. **Abuso distribuido**: Cloudflare está delante del dominio, pero la existencia de reglas reales por IP/ASN, desafío antibots y exclusiones de proxy no se puede demostrar con encabezados HTTP. Revisar en el panel de Cloudflare antes del despliegue.
4. **Autorización funcional**: ejecutar pruebas de extremo a extremo con dos talleres y motos de distinto dueño; confirmar denegación de UUID o placa de terceros, cuentas desvinculadas, cotizaciones, citas y acceso heredado sin crear usuarios por consulta.
5. **Publicación**: mantener PR #16 como borrador y sin merge hasta cerrar lo anterior. El build y los tests no sustituyen la comprobación real de entrega ni las políticas de protección del proxy.
