# Corrección de cuota WhatsApp al cambiar de Basic a Full

## Causa confirmada en el código

El alta de organizaciones y el pago de suscripciones escribían
`organizations.settings.plan`. La función de cuota WhatsApp leía
`organizations.settings.sub_plan` y, si no estaba, asumía Basic (70 mensajes).
Por eso un taller Full con 70 envíos previos podía ser bloqueado.

Ahora WhatsApp, dashboard, panel y suscripción resuelven el plan por la misma
regla: `plan` válido primero, `sub_plan` como compatibilidad. Full no ejecuta
la reserva de cuota. Basic mantiene 70 y Pro 150. Un downgrade de Full a Basic
no conserva el permiso ilimitado por un `sub_plan` antiguo.

La operación de superadministrador `updateWorkshopPlan` era un stub que
respondía éxito sin persistir. Ahora invoca un RPC exclusivo de service_role
para cambiar ambas claves JSON de forma atómica. El frontend solo muestra éxito
tras comprobar el resultado y actualiza la vista.

## Orden de despliegue

1. Respaldo verificable de la base del servidor Dokploy; **no** ejecutar en un
   Supabase distinto ni restaurar/reinicializar la base existente.
2. Aplicar en la base correcta la migración
   `20261027190500_set_organization_subscription_plan.sql`.
3. Desplegar el commit de esta rama en la aplicación Next.js.
4. Abrir la sección de talleres del superadministrador, buscar Macro Speed
   Motors, seleccionar **Full** desde **Cambiar plan** y verificar que reaparece
   como Full. Este paso deja `settings.plan` y `settings.sub_plan` sincronizados.
5. Consultar la organización por su ID para verificar **ambos** valores y el
   contador del mes. No borrar ni reiniciar contadores.
6. Probar un único envío con autorización de su destinatario; confirmar el
   éxito del proveedor Meta y comprobar la entrega si hay webhook.

## Diagnóstico SQL de solo lectura (en la base correcta)

```sql
SELECT id, name, slug, status,
       settings->>'plan' AS plan_actual,
       settings->>'sub_plan' AS plan_legacy,
       settings->>'whatsapp_count_2026-10' AS enviados_octubre
FROM public.organizations
WHERE lower(name) LIKE '%macro%speed%motors%';
```

Confirmar el ID único antes de actualizar. Si necesitas una reparación
manual urgente antes de desplegar, y **ya verificaste** contrato/plan Full,
puedes aplicar con el UUID exacto del taller (no con un filtro de nombre):

```sql
UPDATE public.organizations
SET settings = coalesce(settings, '{}'::jsonb) ||
    jsonb_build_object('plan','full','sub_plan','full')
WHERE id = '<UUID_VERIFICADO>'::uuid
RETURNING id, name, settings->>'plan' AS plan,
          settings->>'sub_plan' AS sub_plan;
```

Este SQL solo corrige la información de plan del taller seleccionado. No
elimina límites para otros talleres y no concede cuotas adicionales a
Basic/Pro. Si la aplicación aún usa el código viejo, sincronizar ambas claves
evita que siga leyendo Basic; el despliegue corrige la causa para el futuro.

**No** asumir que el mensaje de cuota representa un rechazo de Meta: la UI
antigua mezcla «límite alcanzado» y «error al consultar la cuota» en un mismo
aviso. Un envío aceptado por Meta tampoco equivale a entrega confirmada.
