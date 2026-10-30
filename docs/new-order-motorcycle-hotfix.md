# Reparación de Nueva Orden - Macro Speed Motors

Taller: `ba396d72-1c4e-440e-bee9-e4dd30831ee8`.

Hallazgos de SQL READ ONLY (28/10/2026):
- 30 motocicletas, 31 órdenes.
- 26 órdenes entregadas, 3 en diagnóstico, 2 reparadas aún no entregadas.
- 25 motocicletas sin órdenes abiertas, 5 con órdenes abiertas.
- La página /work-orders y la página inicial /[tenant] rechazaban **cualquier
  motocicleta con una orden previa**, incluso si ya estaba entregada.
- /[tenant] también aplicaba el límite por defecto de solo 10 motos.

Corrección:
- Ambas páginas usan ahora una consulta común de motos (hasta 1000),
  técnicos y órdenes no finalizadas.
- Se muestran las motos con historial entregado como seleccionables.
- Las motos con orden aún abierta aparecen deshabilitadas y con la etiqueta
  «orden abierta». El backend sigue validando la duplicación.
- El backend falla de forma segura si la consulta de órdenes activas da error.
- No hay migraciones ni UPDATE/DELETE/INSERT en la BD de producción.

Validación: comprobar TypeScript y tests en CI antes de desplegar. Después,
entrar con la sesión autorizada a /work-orders y al inicio /macro-speed-motors,
abrir «Nueva Orden» y verificar opciones y marcas de orden abierta. **No
guardar una orden de prueba real sin autorización**: enviaría notificaciones
y modificaría el historial de la moto.
