# Órdenes, abonos, facturación y comisiones

## Comportamiento

- Los estados manuales son **Diagnosticando** y **Reparado**. La entrega se registra al pagar la venta por servicio. Una venta directa de mostrador no entrega una orden.
- Las órdenes históricas entregadas que solo tienen abonos pueden emitir su factura pendiente desde Venta por servicio; no se reabren ni se facturan automáticamente.
- Los abonos se conservan en caja y en el historial de la orden. No aparecen como facturas terminadas ni generan comisión. La factura muestra valor completo, abono y cobro final por separado.
- `sales.total` sigue representando el dinero ingresado en ese movimiento, para conservar los cierres de caja existentes. `invoice_total` contiene el valor de la factura y `deposit_amount` su abono aplicado.
- La factura y el inventario se cierran en una transacción. No se descuentan de nuevo repuestos ya reservados. Las cotizaciones, adiciones y devoluciones usan el registro de movimientos; repetir una aprobación no vuelve a descontar stock.
- Los egresos de nómina aparecen en el cierre diario con su medio de pago; una transferencia no disminuye el efectivo de caja.
- Las comisiones se calculan en PostgreSQL sobre la mano de obra facturada y cobrada pendiente del técnico registrado en la factura. Los repuestos y abonos no entran en la base. Cada liquidación guarda los servicios pagados, el porcentaje y el medio de pago.
- Las liquidaciones históricas se conservan; sus periodos cubren únicamente facturas anteriores sin el nuevo detalle. Los nuevos servicios se controlan por su identificador y no quedan ocultos por un periodo antiguo.
- La búsqueda de repuestos selecciona un SKU exacto o un resultado único. Una búsqueda ambigua requiere selección manual. Enter lleva a cantidad; no agrega el producto sin confirmación.
- Las páginas privadas, el aviso de prueba y el pie usan el ancho disponible. Las acciones de órdenes pueden pasar a otra línea; las tablas conservan desplazamiento horizontal en pantallas pequeñas.

## Migración y validación

Migración: `20261111042449_service_checkout_deposits_payroll.sql`.

La migración clasifica abonos históricos y conserva ventas, movimientos de caja y pagos anteriores. Añade el detalle de servicios liquidados, permisos por taller, solicitudes idempotentes y bloqueo de cambios en facturas emitidas. No convierte ni recalcula pagos históricos.

Las pruebas de dinero/inventario cubren abonos repetidos, facturación completa, stock insuficiente con rollback, reservas/devoluciones, edición de facturas, servicios sin repuestos, Wompi pendiente, comisión sobre mano de obra y liquidaciones repetidas. Los periodos usan días completos de Colombia.

Para ejecutar la regresión de PostgreSQL debe usarse una copia desechable y establecer `motomanager.validation=isolated` en esa sesión. El archivo de regresión revierte todos sus datos de prueba. El navegador de integración utiliza exclusivamente el proyecto aislado `mm-workflow-validation` y contactos ficticios.

Estado de publicación: **publicado y verificado en producción** el 11 de noviembre de 2026, 05:32 UTC.

- Código de la imagen: `8d0e2c7c3faadd418bdf4f60ccbad3ffdd344514`.
- Imagen activa: `sha256:ca381c8d3ad143a70fcf4de6965de732b54c5efaf9d1e333be17ce559f1b6eae`.
- TypeScript y compilación aprobados. Suite: **167 pruebas aprobadas, 2 omitidas por requerir Redis local**.
- Regresión de PostgreSQL 17 aprobada sobre una restauración aislada de producción, con roles y políticas reales.
- Navegador aislado: SKU y cantidad, abono, Reparado, factura con abono/saldo, entrega, liquidación, exclusión de servicios ya pagados tras recargar y egreso de nómina en el cierre diario. Sin errores JavaScript. Anchos 1920, 1366 y 390 verificados.
- Revisión en producción: órdenes y dos estados manuales; abonos ocultos en ventas; formulario de venta por servicio; nómina con medio de pago; administración de pagos. Sin errores JavaScript y sin crear ventas, pagos u órdenes durante esa comprobación.
- La migración comprobó dentro de la transacción que no cambiaron importes, estados ni líneas de las ventas anteriores, pagos de nómina, estados de órdenes, stock ni pruebas pausadas. Se clasificaron los 9 abonos históricos; los 8 pagos de nómina anteriores se conservaron.
- Se detectaron 6 órdenes históricas entregadas con abonos y sin factura final. Quedaron disponibles para facturación explícita desde Venta por servicio; no se reabrieron ni se cobraron automáticamente.
- Se conservaron respaldos privados antes de la migración y la imagen anterior para reversión. La configuración local preexistente de staging quedó intacta.

Las pruebas de escritura se realizaron exclusivamente en el entorno aislado y con contactos ficticios. No se hicieron cobros bancarios reales ni se enviaron mensajes a clientes durante la validación.
