# Pago de suscripción desde una prueba gratuita

La pantalla de suscripción ofrecía registrar un ticket cuando faltaba alguna variable de Wompi. El webhook de suscripción usaba `workshops` y referencias antiguas, mientras los planes activos están en `organizations.settings`. La clave pública también podía quedar vacía dentro de una imagen construida antes de recibir las variables de producción.

## Comportamiento

El dueño o administrador elige Básico, Pro o Full y el periodo mensual, semestral o anual. El servidor consulta el catálogo, calcula el importe y registra una compra inmutable ligada al taller y al usuario antes de firmarla y abrir el checkout web de Wompi. La prueba nunca genera saldo monetario. Los descuentos vigentes se conservan.

El retorno de Wompi y el webhook consultan la transacción desde el servidor y usan la misma función de activación. Se comprueban referencia exacta, moneda, importe y correo de la compra registrada. Un estado pendiente o rechazado se registra sin activar el plan. Una aprobación activa el producto y el periodo de la compra. Se conservan los días gratuitos restantes mediante la función de conversión existente. El webhook permite completar la compra aunque el cliente cierre la pantalla.

La activación y el registro de la transacción son atómicos. Los reintentos del webhook o de la página de retorno no renuevan la fecha otra vez. No se retira una pausa administrativa por verificación mediante un pago. El historial del administrador incluye la transacción, el taller, el producto, el periodo y su estado, deduplicando los pagos ya presentes en el historial anterior.

La pantalla ofrece pago único con PSE, Nequi o tarjeta en el checkout de Wompi; no usa el formulario antiguo de débito automático. Si el cobro no está configurado, presenta un aviso temporal sin prometer una solicitud comercial. La clave pública del checkout se entrega desde el servidor al preparar el pago y no depende de que estuviera presente durante la compilación. Los secretos permanecen en el servidor.

## Estado del despliegue — 9 de noviembre de 2026

El VPS `vmi3462336` ya está conectado. La base real quedó respaldada y la migración `20261109150531_subscription_wompi_checkout.sql` quedó instalada. La imagen `motomanager-next:wompi-checkout-20261109` compiló correctamente en el VPS y pasó las pruebas completas de navegador sobre una copia aislada de PostgreSQL 17. También se comprobó la aplicación candidata contra la base de producción, únicamente con lecturas.

La aplicación pública sigue en el commit `3a21fed74798a807ce5c10e3c03010238631d867`. La sustitución de la aplicación está preparada y pendiente de completar la configuración de Wompi: el servidor tiene `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` y `WOMPI_INTEGRITY_SECRET`, pero no tiene `WOMPI_PRIVATE_KEY` ni `WOMPI_EVENTS_SECRET`. La consulta pública del comercio respondió HTTP 200. Esto confirma la clave pública, no la capacidad de verificar transacciones desde el servidor.

Se dejó `/opt/motomanager-production/wompi-secrets.env`, con permisos 0600, para guardar las dos claves de producción del mismo comercio. No deben copiarse a Git. El importador privado `/opt/motomanager-wompi-20261109/import-wompi-secrets.py` comprueba el ambiente y actualiza las variables de ejecución cuando estén completas. La URL de eventos del comercio debe entregar `transaction.updated` a `https://motomanager.com.co/api/wompi/webhook`; esta configuración pertenece al panel de Wompi y no se pudo consultar con la clave pública.

El despliegue automático quedó habilitado, el checkout de producción volvió a su commit público y se conservó la modificación previa de staging. La ruta pública y la imagen activa no se cambiaron. Los contenedores de validación se retiraron al terminar. El respaldo, la imagen y los resultados privados de las pruebas se conservan en el VPS para completar la publicación cuando estén las claves.

### Pasos restantes

1. Guardar `WOMPI_PRIVATE_KEY` y `WOMPI_EVENTS_SECRET` de producción en el archivo privado preparado y configurar la URL de eventos en el comercio de Wompi.
2. Importar las claves con el helper privado. El esquema ya está instalado: no volver a aplicar la migración.
3. Publicar la imagen preparada con `deploy-checkout.py`, usando un candidato, las comprobaciones de lectura y la sustitución del servicio web. Mantener `TZ=America/Bogota` y preservar la modificación de staging. Confirmar que cualquier commit posterior al de la imagen solo cambia documentación, o reconstruir si cambia código.
4. Verificar la apertura real de Wompi y el receptor de eventos, sin completar un cobro real no solicitado. Integrar la rama en `codex/migration-production-20261106` y restablecer el despliegue automático si se pausó durante la publicación.

## Validación realizada

- Pruebas de protocolo: firma de integridad oficial, propiedades variables de firma de eventos y rechazo de transacciones que no coinciden con la compra.
- Prueba de configuración real del servidor: lectura de variables en ejecución, ambientes mezclados, consulta privada a Wompi y rechazo de identificadores inválidos.
- PostgreSQL mediante PGlite, ejecutando las migraciones reales: permisos, aislamiento de talleres, estados sin pago, validación de importes, activación, fechas, idempotencia, historial y pausa administrativa.
- Regresión de prueba gratuita y revisión administrativa: 20 pruebas aprobadas en el conjunto focalizado.
- Interacción DOM con los componentes React reales y llamadas de servidor simuladas: 13 escenarios aprobados, incluidos los tres productos por las tres duraciones, pendiente seguido de aprobación, rechazo y errores de configuración/preparación. Esto no constituye una prueba visual en un navegador real.
- Suite completa: 153 pruebas aprobadas y 2 omitidas por requerir Redis local. `npm run typecheck` y `npm run build` aprobados. No se realizó un pago real.
- Chromium real en el VPS y PostgreSQL 17 aislado: apertura del checkout, pago pendiente, aprobación por webhook sin retorno del cliente, retorno posterior, reintentos idempotentes y firma inválida para los tres ciclos. También se verificó un pago rechazado y el historial real de administración. Cero errores JavaScript; sin cambios en clientes u órdenes de producción.
- Candidato contra la base real: pantalla de suscripción y administración, aviso de configuración incompleta, modal en 1440 y 390 px y ausencia de nuevos registros de compra. Cero errores JavaScript; no se consumieron refresh tokens reales.
- Permisos de producción: RLS habilitado, tabla privada inaccesible para `anon`/`authenticated`, cuatro funciones `SECURITY INVOKER` con `search_path` fijado y ejecución exclusiva de `service_role`. La consulta del historial devolvió HTTP 200 para el servidor y HTTP 401 para acceso anónimo. Los asesores CLI locales no pudieron conectarse porque no hay un stack PostgreSQL local; las comprobaciones específicas de esta migración se ejecutaron directamente en el VPS.

## Referencias

- [Wompi: checkout web y retorno de transacción](https://docs.wompi.co/docs/colombia/widget-checkout-web/)
- [Wompi: eventos y comprobación de firma](https://docs.wompi.co/docs/colombia/eventos/)
- [Next.js: variables de entorno y consultas dinámicas en ejecución](https://nextjs.org/docs/app/guides/environment-variables)
