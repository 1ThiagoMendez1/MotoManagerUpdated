# Cuota WhatsApp: discrepancia entre Full Taller y contador básico

## Causa detectada en código
`src/lib/actions/subscription.ts` guarda el plan en `organizations.settings.plan`.
`src/app/dashboard/subscription/page.tsx` muestra el plan desde ese campo.
Antes, `src/lib/whatsapp.ts` ignoraba `settings.plan`, usando solo
`settings.sub_plan || 'basic'`. Por eso un taller con Full en la interfaz
podía recibir un rechazo de cuota Básica (70 mensajes) si el campo anterior
no existía o tenía un valor obsoleto.

## Cambio
- Tomar el plan de `settings.plan`; si no existe o no es un plan reconocido,
  usar el antiguo `settings.sub_plan` y finalmente Básico.
- El plan Full (`whatsapp_limit = -1`) no ejecuta la RPC de reserva.
- Los planes Básico/Pro mantienen su reserva atómica y límites.
- No se reescriben datos ni se reinician contadores.
- Los cambios de estado muestran un mensaje diferente para límite alcanzado
  y fallo técnico de comprobación, con enlace de WhatsApp manual.
- Envíos de otros flujos siguen usando el helper booleano compatible.

## Comprobaciones pendientes en producción
Desktop Commander apareció OFFLINE el 27/10/2026, por lo que no se ha
consultado ni alterado la fila real de Macro Speed Motors.
Consultar solo lectura:
```sql
SELECT id, name, slug,
       settings->>'plan' AS plan_actual,
       settings->>'sub_plan' AS plan_legacy,
       settings->>'whatsapp_count_2026-10' AS contador_octubre
FROM public.organizations
WHERE lower(name) LIKE '%macro%speed%';
```
Confirmar además RPC `reserve_workshop_whatsapp_quota` existente y registros
recientes. No modificar contadores sin auditar la entrega real.

## Verificación antes de publicar
Ejecutar tests `tests/whatsapp-quota-plan.test.ts`, TypeScript, lint, build,
preparar respaldo y validar HTTP. Sin envío real a clientes ni despliegue hasta
confirmar que el taller está en Full y el servicio funciona.
