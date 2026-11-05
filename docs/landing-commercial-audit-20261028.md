# Auditoría comercial y rediseño público de MotoManager (28/10/2026)

## Fuentes consultadas
- Rama `codex/v6.8.0-horarios-quota-hardening-20261023` del repositorio.
- PostgreSQL **real** en VPS `vmi3462336`, consultas `BEGIN READ ONLY`.
- Módulos de planes, registro, pagos, roles, inventario, órdenes y WhatsApp.

## Catálogo comprobado en producción
| Plan | Precio mensual en BD | WhatsApp/mes según código | Usuarios según código |
|---|---:|---:|---:|
| Básico | $49.900 COP | 70 | 3 |
| Pro Taller | $79.900 COP | 150 | 3 |
| Full Taller | $119.900 COP | Sin límite interno por plan | Sin límite por plan |

Precios de la tabla `subscription_plans`. Las cuotas de mensajes y
usuarios proceden de `getPlanLimits`, utilizadas por el envío y por
`src/lib/actions/team.ts`. Los importes semestrales y anuales se calculan
en el checkout existente: 10 % y 20 % de descuento respectivamente.

## Inconsistencias encontradas
1. La landing anterior afirmaba más de 500 talleres, 50.000 órdenes,
   200.000 clientes y 4,9 estrellas sin respaldo. Totales reales
   en consulta: 7 organizaciones, 48 órdenes, 297 clientes y 323 motos.
   **No** publicar estas cifras sin definir métricas/consentimientos.
2. Testimonios con nombres y resultados comerciales fijos en el código,
   sin evidencia de autorización ni verificaciones: retirados.
3. Barra con temporizador y avisos aleatorios de ventas: retirados.
4. Precio `$18.900` en metadata, pie y FAQs, incorrecto frente a
   $49.900 del plan Básico: retirado. La landing consulta precios reales
   en el servidor; si la BD está temporalmente indisponible, usa
   `DEFAULT_PLANS` como respaldo.
5. Teléfono WhatsApp `+57 300 1234567` era un placeholder: retirado.
   Verificar el canal comercial real antes de añadir uno.
6. `subscription_features` dice seis usuarios en Pro, pero el control
   `src/lib/actions/team.ts` usa `getPlanLimits('pro').users_limit = 3`.
   **Pendiente de decisión comercial/técnica**: no se modificó la BD.
7. La BD contiene la frase 'Soporte 24/7' sin evidencia de cobertura
   operativa. No se muestra como garantía de servicio.
8. Varias funcionalidades estaban descritas como disponibles en todos
   los planes, o 'ilimitadas' sin respetar el control real: ahora se usan
   los flags y límites `DEFAULT_PLANS` para la tabla comercial.
9. El pie antiguo enlazaba documentos legales a `#` (enlaces vacíos):
   se retiraron hasta publicar documentos jurídicos válidos.
10. **Auditoría de pagos pendiente, alta prioridad:** el flujo de
    `PlanesPage` abre el formulario postpago con el querystring
    `payment=success`. `registerWorkshopPublic` no valida
    de forma explícita la referencia Wompi antes de crear el usuario.
    Esto requiere un arreglo independiente y pruebas end-to-end del
    proceso de cobro antes de considerarlo protegido. No se alteró
    la pasarela ni el webhook durante el rediseño.
11. No confundir 'pago procesado' con 'alta activada'. En el formulario,
    donde antes aparecía `Plan activado · $0`, ahora figura
    `Plan seleccionado` sin un importe inventado.

## Trabajo incorporado en la rama
- Hero y navegación responsivos con identidad corporativa azul/cian.
- Vista **ilustrativa y etiquetada** del flujo de trabajo (sin datos falsos).
- Funciones concretas verificadas con los módulos del producto.
- Sección de proceso de recepción a entrega.
- Precios conectados a `subscription_plans` desde el servidor;
  las capacidades mostradas usan límites de aplicación.
- Preguntas frecuentes basadas en el código, no en promesas de soporte.
- Directorio de talleres ya existente sigue usando datos reales.
- SEO sin '#1' o precios obsoletos.
- Enlaces de login y flujo de compra conservados; sin cambios de datos
  de talleres, planes, cuentas, pagos ni RLS.

## Antes de publicar
1. Aprobar `npm run typecheck` y `npm test` en CI y build de Next.js.
2. Revisar diseño en móvil y escritorio; comprobar modo claro y oscuro.
3. Confirmar precios actuales en `subscription_plans`.
4. Probar selección de Basic, Pro y Full para mensual, semestral y anual;
   confirmar que el monto enviado a Wompi coincide con la selección.
5. Revisar alta y validación real de pago antes de atraer tráfico de pago.
6. Preparar términos, privacidad y datos de contacto verificados.
7. Confirmar con un cliente autorizado cualquier testimonio futuro.

No se aplicaron migraciones ni comandos de mutación en producción.
