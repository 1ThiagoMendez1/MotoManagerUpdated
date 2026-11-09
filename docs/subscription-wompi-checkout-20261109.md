# Pago de suscripción desde una prueba gratuita

La pantalla de suscripción ofrecía registrar un ticket cuando faltaba alguna variable de Wompi. El webhook de suscripción usaba `workshops` y referencias antiguas, mientras los planes activos están en `organizations.settings`. La clave pública también podía quedar vacía dentro de una imagen construida antes de recibir las variables de producción.

## Comportamiento

El dueño o administrador elige Básico, Pro o Full y el periodo mensual, semestral o anual. El servidor consulta el catálogo, calcula el importe y registra una compra inmutable ligada al taller y al usuario antes de firmarla y abrir el checkout web de Wompi. La prueba nunca genera saldo monetario. Los descuentos vigentes se conservan.

El retorno de Wompi y el webhook consultan la transacción desde el servidor y usan la misma función de activación. Se comprueban referencia exacta, moneda, importe y correo de la compra registrada. Un estado pendiente o rechazado se registra sin activar el plan. Una aprobación activa el producto y el periodo de la compra. Se conservan los días gratuitos restantes mediante la función de conversión existente. El webhook permite completar la compra aunque el cliente cierre la pantalla.

La activación y el registro de la transacción son atómicos. Los reintentos del webhook o de la página de retorno no renuevan la fecha otra vez. No se retira una pausa administrativa por verificación mediante un pago. El historial del administrador incluye la transacción, el taller, el producto, el periodo y su estado, deduplicando los pagos ya presentes en el historial anterior.

La pantalla ofrece pago único con PSE, Nequi o tarjeta en el checkout de Wompi; no usa el formulario antiguo de débito automático. Si el cobro no está configurado, presenta un aviso temporal sin prometer una solicitud comercial. La clave pública del checkout se entrega desde el servidor al preparar el pago y no depende de que estuviera presente durante la compilación. Los secretos permanecen en el servidor.

## Estado del despliegue — publicado el 9 de noviembre de 2026

Las claves de producción de Wompi se guardaron en el archivo privado preparado y se importaron a las variables de ejecución. El comercio respondió HTTP 200 y está activo. La migración `20261109150531_subscription_wompi_checkout.sql` está instalada en PostgreSQL 17, con respaldo previo y permisos verificados.

La imagen `motomanager-next:wompi-checkout-20261109` está publicada en el servicio web de producción. Su identificador es `sha256:7a06e192a6247fc7b4e47f6d1ca01a0fb6ce8d3b61f599d10b69ae0b1899f0f0`. El código de aplicación de la imagen corresponde a `a3bb48a5f68f70bf810a21f28bc93260ebb6d555`; los commits posteriores de esta rama únicamente actualizan esta documentación.

La versión publicada muestra el botón de pago desde una prueba gratuita, abre el checkout de Wompi y permite consultar el historial administrativo. Las comprobaciones públicas en escritorio y móvil terminaron sin errores JavaScript ni nuevos registros de compra. La apertura del checkout real mostró la interfaz de pago de Wompi, sin errores de CloudFront y sin iniciar un cobro.

El receptor `https://motomanager.com.co/api/wompi/webhook` aceptó un evento de verificación firmado con el secreto configurado y rechazó una firma inválida. La firma de integridad del checkout coincidió con la generada por el servidor. Estos controles verifican el receptor y el checkout; no sustituyen un pago real ni prueban por sí solos la entrega de eventos desde la configuración del panel del comercio. La URL de eventos del comercio debe apuntar a este receptor.

El despliegue conserva `TZ=America/Bogota`, la modificación previa de staging y el servicio anterior como imagen de recuperación. Los secretos permanecen fuera de Git. El despliegue automático se restablece al concluir la integración de la rama, y se retira el candidato temporal.

## Validación realizada

- Pruebas de protocolo: firma de integridad oficial, propiedades variables de firma de eventos y rechazo de transacciones que no coinciden con la compra.
- Prueba de configuración real del servidor: lectura de variables en ejecución, ambientes mezclados, consulta privada a Wompi y rechazo de identificadores inválidos.
- PostgreSQL mediante PGlite, ejecutando las migraciones reales: permisos, aislamiento de talleres, estados sin pago, validación de importes, activación, fechas, idempotencia, historial y pausa administrativa.
- Regresión de prueba gratuita y revisión administrativa: 20 pruebas aprobadas en el conjunto focalizado.
- Interacción DOM con los componentes React reales y llamadas de servidor simuladas: 13 escenarios aprobados, incluidos los tres productos por las tres duraciones, pendiente seguido de aprobación, rechazo y errores de configuración/preparación. Esto no constituye una prueba visual en un navegador real.
- Suite completa: 153 pruebas aprobadas y 2 omitidas por requerir Redis local. `npm run typecheck` y `npm run build` aprobados. No se realizó un pago real.
- Chromium real en el VPS y PostgreSQL 17 aislado: apertura del checkout, pago pendiente, aprobación por webhook sin retorno del cliente, retorno posterior, reintentos idempotentes y firma inválida para los tres ciclos. También se verificó un pago rechazado y el historial real de administración. Cero errores JavaScript; sin cambios en clientes u órdenes de producción.
- Candidato y aplicación pública contra la base real: pantalla de suscripción y administración, botón de Wompi habilitado, modal en 1440 y 390 px y ausencia de nuevos registros de compra. Cero errores JavaScript; no se consumieron refresh tokens reales. Antes de cargar las claves también se verificó el aviso de configuración incompleta.
- Permisos de producción: RLS habilitado, tabla privada inaccesible para `anon`/`authenticated`, cuatro funciones `SECURITY INVOKER` con `search_path` fijado y ejecución exclusiva de `service_role`. La consulta del historial devolvió HTTP 200 para el servidor y HTTP 401 para acceso anónimo. Los asesores CLI locales no pudieron conectarse porque no hay un stack PostgreSQL local; las comprobaciones específicas de esta migración se ejecutaron directamente en el VPS.

## Referencias

- [Wompi: checkout web y retorno de transacción](https://docs.wompi.co/docs/colombia/widget-checkout-web/)
- [Wompi: eventos y comprobación de firma](https://docs.wompi.co/docs/colombia/eventos/)
- [Next.js: variables de entorno y consultas dinámicas en ejecución](https://nextjs.org/docs/app/guides/environment-variables)
