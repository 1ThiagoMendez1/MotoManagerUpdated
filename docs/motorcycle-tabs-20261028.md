# Pestañas de motos y estados de órdenes

El taller Macro Speed Motors (`ba396d72-1c4e-440e-bee9-e4dd30831ee8`) pidió
un resumen operativo sin perder el historial.

## Módulo /motorcycles
- Todas: todas las motocicletas de la organización y la búsqueda actual.
- Sin orden: nunca tuvieron ninguna orden.
- Con orden activa: al menos una orden sin entregar (incluye reparada,
  que **no** está finalizada mientras no se entregue).
- Finalizadas: tienen historial y no presentan ninguna orden abierta.
  Las canceladas también están cerradas, pero se etiquetan «Cancelada».
- Se muestra el estado exacto (diagnosticando, reparada pendiente de
  entrega, entregada, etc.) y se enlaza la orden relevante.
- Si hay varias órdenes, una abierta gana frente a una entregada
  anterior. La fecha elige la más reciente dentro de la categoría.
- Los conteos y filtros se calculan **antes** de paginar; la búsqueda
  mantiene la pestaña elegida y los enlaces conservan la búsqueda.
- El lector carga páginas de 200 motos y lotes de órdenes de 500
  para evitar el límite predeterminado de PostgREST de 1000 resultados.

## Módulo /work-orders
Se conserva el historial de órdenes activas y finalizadas, con la
nueva vista «Motos sin orden» que permite abrir el formulario de
creación. Esta vista solo incluye motos **sin ninguna orden histórica**,
no las reparadas o entregadas anteriormente. Una moto entregada puede
reingresar desde «Nueva Orden» si no tiene orden activa.

No se incluyen cambios SQL ni modificaciones en clientes, órdenes,
motos, configuraciones o cuotas.

Validación: npm run typecheck y npm test deben aprobar en CI. Para
publicar, desplegar el commit en Dokploy y verificar con la cuenta
autorizada: todas, sin orden, con orden activa, finalizadas, navegación
y búsqueda. No crear órdenes reales de prueba para el cliente sin
autorización; podrían emitir notificaciones.
