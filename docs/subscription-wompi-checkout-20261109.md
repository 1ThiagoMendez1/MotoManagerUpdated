# Pago de suscripción desde una prueba gratuita

La pantalla de suscripción ofrecía registrar un ticket cuando faltaba alguna variable de Wompi. El webhook de suscripción usaba `workshops` y referencias antiguas, mientras los planes activos están en `organizations.settings`. La clave pública también podía quedar vacía dentro de una imagen construida antes de recibir las variables de producción.

## Comportamiento

El dueño o administrador elige Básico, Pro o Full y el periodo mensual, semestral o anual. El servidor consulta el catálogo, calcula el importe y registra una compra inmutable ligada al taller y al usuario antes de firmarla y abrir el checkout web de Wompi. La prueba nunca genera saldo monetario. Los descuentos vigentes se conservan.

El retorno de Wompi y el webhook consultan la transacción desde el servidor y usan la misma función de activación. Se comprueban referencia exacta, moneda, importe y correo de la compra registrada. Un estado pendiente o rechazado se registra sin activar el plan. Una aprobación activa el producto y el periodo de la compra. Se conservan los días gratuitos restantes mediante la función de conversión existente. El webhook permite completar la compra aunque el cliente cierre la pantalla.

La activación y el registro de la transacción son atómicos. Los reintentos del webhook o de la página de retorno no renuevan la fecha otra vez. No se retira una pausa administrativa por verificación mediante un pago. El historial del administrador incluye la transacción, el taller, el producto, el periodo y su estado, deduplicando los pagos ya presentes en el historial anterior.

La pantalla ofrece pago único con PSE, Nequi o tarjeta en el checkout de Wompi; no usa el formulario antiguo de débito automático. Si el cobro no está configurado, presenta un aviso temporal sin prometer una solicitud comercial. La clave pública del checkout se entrega desde el servidor al preparar el pago y no depende de que estuviera presente durante la compilación. Los secretos permanecen en el servidor.

## Despliegue pendiente

El 9 de noviembre de 2026 Desktop Commander reportó `vmi3462336` desconectado. Este cambio está preparado para desplegar, pero no se aplicó la migración ni se sustituyó la aplicación en producción. Se debe instalar la migración antes de publicar este código.

1. Reconectar Desktop Commander en `vmi3462336` y comprobar el HEAD real y las modificaciones locales del checkout de Dokploy. Conservar la modificación previa de staging.
2. Comprobar en privado las variables del servicio web: `WOMPI_PUBLIC_KEY` o `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` y `WOMPI_ENVIRONMENT=production`. Reutilizar las credenciales de la landing; no copiarlas a Git ni a logs. Confirmar que todas corresponden al mismo ambiente.
3. Respaldar la base PostgreSQL y aplicar, dentro de una transacción, `supabase/migrations/20261109150531_subscription_wompi_checkout.sql`. Su instalación no convierte, pausa ni modifica talleres existentes. Recargar el esquema de PostgREST.
4. Verificar que la URL de eventos del comercio en Wompi sea `https://motomanager.com.co/api/wompi/webhook`, o que una URL existente del mismo comercio entregue los eventos a este handler. La URL de eventos es configuración del comercio; cambiar código no la configura por sí solo.
5. Ejecutar los asesores contra la base real, compilar la imagen y publicar solo el servicio web con el procedimiento de sustitución ya utilizado. Mantener `TZ=America/Bogota`.
6. Verificar en una base aislada las tres duraciones, el retorno pendiente y rechazado, el webhook aprobado sin retorno y los reintentos. En producción verificar apertura del checkout sin completar un cobro real no solicitado, la configuración del receptor y el historial administrativo.
7. Solo después de instalar la migración y verificar el servicio, integrar la rama en `codex/migration-production-20261106` y restablecer el despliegue automático si se pausó durante la publicación.

## Validación realizada

- Pruebas de protocolo: firma de integridad oficial, propiedades variables de firma de eventos y rechazo de transacciones que no coinciden con la compra.
- Prueba de configuración real del servidor: lectura de variables en ejecución, ambientes mezclados, consulta privada a Wompi y rechazo de identificadores inválidos.
- PostgreSQL mediante PGlite, ejecutando las migraciones reales: permisos, aislamiento de talleres, estados sin pago, validación de importes, activación, fechas, idempotencia, historial y pausa administrativa.
- Regresión de prueba gratuita y revisión administrativa: 20 pruebas aprobadas en el conjunto focalizado.
- Interacción DOM con los componentes React reales y llamadas de servidor simuladas: 13 escenarios aprobados, incluidos los tres productos por las tres duraciones, pendiente seguido de aprobación, rechazo y errores de configuración/preparación. Esto no constituye una prueba visual en un navegador real.
- Suite completa: 153 pruebas aprobadas y 2 omitidas por requerir Redis local. `npm run typecheck` y `npm run build` aprobados. No se realizó un pago real.
- No se pudo completar la instalación de Chromium: las dos versiones disponibles devolvieron descargas truncadas. Los asesores locales no pudieron conectarse a `127.0.0.1:54322`, ya que no existe una instancia local del stack; queda pendiente ejecutarlos en el VPS.

## Referencias

- [Wompi: checkout web y retorno de transacción](https://docs.wompi.co/docs/colombia/widget-checkout-web/)
- [Wompi: eventos y comprobación de firma](https://docs.wompi.co/docs/colombia/eventos/)
- [Next.js: variables de entorno y consultas dinámicas en ejecución](https://nextjs.org/docs/app/guides/environment-variables)
