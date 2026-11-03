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
