# Auditoría y Plan de Implementación de MotoManager con Supabase

## 1. Análisis del Proyecto Existente

He analizado la base de código actual ubicada en la raíz del proyecto. A continuación se presentan los hallazgos clave:

### 1.1 Tecnologías y Estructura
- **Versión de Next.js**: 15.3.3
- **Versión de React**: 18.3.1
- **Router utilizado**: App Router (`src/app/` detectado).
- **Componentes / Acciones**:
  - Utiliza **Server Components** por defecto (App Router).
  - Existen **Server Actions** (`actions.ts` en `src/app/admin/actions.ts` y posiblemente otros).
  - Presencia de rutas API (Route Handlers probables).
- **Gestión de Estado / Fetching**: 
  - No se detecta Redux, Zustand o React Query en `package.json`.
  - El proyecto probablemente confía en Server Actions para mutaciones y fetching nativo de React/Next.js o estados locales.
  - Existen hooks y contexts (`src/hooks/`).
- **Dependencias Actuales de Supabase**:
  - **No** se detecta `@supabase/supabase-js` ni `@supabase/ssr` en `package.json`. La integración con Supabase aún no se ha inicializado.

### 1.2 Formularios y Datos Simulados
- **Formularios**: Múltiples formularios existentes manejados por `react-hook-form` y `@hookform/resolvers` con `zod`.
- **Datos simulados detectados**:
  - `src/lib/auth-server.ts`: Mockeo de un usuario (`mock-user-1`) y taller (`mock-workshop-1`).
  - `src/app/admin/actions.ts`: Función `getWorkshopCredentials` que devuelve `email: 'mock@demo.com'`.
  - `src/app/planes/components/LandingTopWorkshops.tsx`: Elementos mock-1, mock-2, etc.

### 1.3 Estado Técnico
- **TypeScript**: Configurado con `"ignoreBuildErrors": true` en `next.config.ts`. Es probable que existan errores de tipado actuales.
- **ESLint**: Falta configuración `.eslintrc.json`, lo que causa que `npm run lint` detenga su ejecución solicitando configuración inicial.
- **Manejo de Errores y Seguridad actual**: Minimalista. Un middleware inicial está en `src/middleware.ts` retornando `NextResponse.next()`, sin protección de rutas implementada aún.

### 1.4 Riesgos y Consideraciones
- Al reemplazar el modelo mock por Supabase Auth, se debe garantizar la transición suave sin afectar los layouts.
- El ignorar errores de build (`ignoreBuildErrors`) puede ocultar problemas de tipado durante la integración. Deberemos procurar tipos estrictos (`database.types.ts`) pero integrarlos cuidadosamente en los componentes que pudieran usar `any` u objetos no estrictos actualmente.
- Es crucial que RLS se defina estrictamente para mantener el aislamiento Multi-Tenant (por `organization_id`).

---

## 2. Plan por Fases

El objetivo es migrar gradualmente a Supabase como backend completo respetando la estructura actual y manteniendo el frontend intacto.

### Fase 1: Fundación (Actual)
- Inicializar Supabase en el repositorio (`npx supabase init`).
- Instalar dependencias necesarias (`@supabase/supabase-js`, `@supabase/ssr`, `server-only`).
- Configurar variables de entorno (`.env.example` y local).
- Crear los clientes (browser, server, admin) en `src/lib/supabase/`.
- Configurar el Auth Middleware (`src/middleware.ts` renovado para Next 15+).
- Definir migraciones SQL iniciales: Perfiles, Organizaciones y Miembros (Multi-tenant).
- Generar tipos TypeScript desde Supabase.

### Fase 2: Negocio Principal
- Diseñar y crear las tablas e interfaces para:
  - Clientes (`customers`).
  - Motocicletas (`motorcycles`).
  - Citas (`appointments`).
  - Órdenes de Trabajo (`work_orders`) y Servicios (`services`).
- Conectar componentes y formularios principales a la base de datos reemplazando los mocks de `lib/auth-server.ts` y las consultas simuladas.

### Fase 3: Inventario y Facturación
- Modelar en SQL:
  - Proveedores (`suppliers`).
  - Inventario, ubicaciones y movimientos.
  - Facturación (`invoices`) y pagos (`payments`).
- Implementar funciones RPC transaccionales para consumos de inventario seguros.

### Fase 4: Archivos y Tiempo Real
- Configurar Storage (Evidencias de órdenes, fotos de motos).
- Configurar políticas RLS en buckets.
- Habilitar `Supabase Realtime` para actualizaciones de estado de órdenes de trabajo.

### Fase 5: Procesos Asíncronos
- Configuración de Edge Functions y Webhooks (para futuras notificaciones o pagos externos).
- Preparación para integraciones de IA (si aplica).

### Fase 6: Endurecimiento (Hardening)
- Refinar pruebas de RLS, crear índices y optimizar consultas usando `EXPLAIN ANALYZE`.
- Completar auditorías y documentación.

*Nota: Una vez aprobado este plan general y la Fase 0 completada, se pasará a ejecutar la Fase 1.*
