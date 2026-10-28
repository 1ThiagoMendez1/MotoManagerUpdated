# Hotfix: despliegue y motocicletas de Macro Speed Motors

Taller indicado: `ba396d72-1c4e-440e-bee9-e4dd30831ee8`.

## Fallos encontrados en la rama
- La compilación anterior fallaba por comparar la clasificación del plan
  `basic/pro/full` con valores de periodicidad `monthly/yearly` en
  `src/app/admin/page.tsx`. Ahora `billing_cycle` se calcula por separado.
- La pantalla `/motorcycles` ocultaba motos si habían tenido cualquier
  orden de trabajo (incluidas órdenes terminadas). Ahora muestra todas las
  motos que devuelve la consulta para el taller autenticado, con paginación.
  **No** hay cambios de datos, reasignación de clientes, ni borrado.
- La consulta ahora comunica errores en lugar de simular que hay cero motos.
- La búsqueda restablece la paginación a página 1.

## Consulta SQL de diagnóstico, SOLO LECTURA en la BD correcta de Dokploy

```sql
SELECT id, name, slug, status, settings->>'plan' AS plan,
       settings->>'sub_plan' AS sub_plan
FROM public.organizations
WHERE id='ba396d72-1c4e-440e-bee9-e4dd30831ee8'::uuid;

SELECT m.id, m.license_plate, m.brand, m.model, m.customer_id,
       (SELECT count(*) FROM public.work_orders wo
         WHERE wo.organization_id=m.organization_id
           AND wo.motorcycle_id=m.id) AS numero_de_ordenes
FROM public.motorcycles m
WHERE m.organization_id='ba396d72-1c4e-440e-bee9-e4dd30831ee8'::uuid
ORDER BY m.created_at DESC LIMIT 100;

SELECT user_id, role, status, organization_id
FROM public.organization_members
WHERE organization_id='ba396d72-1c4e-440e-bee9-e4dd30831ee8'::uuid;
```

Si no aparecen motos con ese `organization_id`, o la cuenta del dueño
no tiene una membresía `active`, el problema requiere revisar esos datos
antes de cambiar nada. No ejecutar UPDATE masivos, no mover motocicletas
entre talleres, y no deshabilitar RLS para forzar visibilidad.

## Por qué tardó el Docker build
Del log: `npm ci` tomó ~301 s, copiar `node_modules` ~91 s,
Next/Webpack compiló ~405 s y falló verificando tipos después de ~544 s.
El error fatal fue TypeScript; los avisos de OpenTelemetry/Jaeger no fueron
la causa del fallo. Se añadieron cachés BuildKit para npm y
`.next/cache` que ayudan en siguientes despliegues cuando Dokploy
conserva el caché entre builds. La primera compilación puede seguir tardando.
No se deshabilitó la verificación de TypeScript.

## Validación antes de desplegar
Ejecutar `npm ci --legacy-peer-deps`, `npm run typecheck`,
`npm test`, y `npm run build` en un runner de integración o staging,
antes de publicar. Revisar para el taller una motocicleta con una orden
histórica, una sin orden y una con varios trabajos; buscar por placa,
limpiar búsqueda y recorrer páginas.

La reparación de cuota WhatsApp del commit anterior aún requiere la
migración SQL `20261027190500_set_organization_subscription_plan.sql`
en la base real para que funcione el botón administrativo de cambiar plan.
