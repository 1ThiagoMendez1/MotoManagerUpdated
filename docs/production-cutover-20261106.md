# MotoManager: corte a PostgreSQL propio — 6 de noviembre de 2026

Estado de esta revisión: preparado para el corte. La evidencia final se registra después de completar la conciliación y abrir el tráfico.

## Despliegue

Recurso existente de Dokploy: `motomanagernewmigration`, proyecto Compose `motomanagernew-motomanagernewmigration-ogl915`. Rama de despliegue: `codex/migration-production-20261106`; manifiesto: `infra/dokploy/motomanager-production.compose.yml`.

El manifiesto conserva los nueve servicios de staging y añade producción en su propia red y volúmenes. Los dominios principales pertenecen a `production-web` y `production-gateway`. Los datos ficticios de staging continúan aislados.

La web se compila desde el código mediante Docker. Actualizar la rama y desplegar recompila la aplicación; producción no depende de un directorio standalone antiguo montado en `/opt`. Los secretos se leen de archivos privados bajo `/opt/motomanager-production`; no se incluyen en Git ni en el contexto de construcción. La base de datos y el caché no publican puertos.

Componentes: PostgreSQL 17.11 estándar con wal2json, Redis 7.4.8, Next.js sobre Node 24, GoTrue 2.189.0, PostgREST 14.12, Storage 1.60.4, Realtime 2.102.3 y el gateway Kong 3.9.1. Se mantienen las cuentas, UUID, hashes de contraseña, claves de sesión y el dominio público de la API. Keycloak no participa en el login.

## Compatibilidad comprobada antes del corte

- 133 pruebas generales y dos pruebas con Redis real; TypeScript y build aprobados.
- Dos sesiones copiadas renovadas, aislamiento de datos entre talleres y rechazo de solicitudes sin API key.
- Actualización de una orden recibida por Realtime en el taller autorizado; rechazo de ese evento en el otro taller.
- Descarga autenticada de los 43 archivos de la copia inicial y de sus 40 archivos públicos sin exigir una API key en la URL.
- Navegación autenticada en ocho apartados y rechazo del endpoint de diagnóstico administrativo para un dueño.
- Una única migración adicional de negocio: `20261028200000_scoped_technician_directory.sql`. Las migraciones de pruebas gratuitas y analítica ya existen en origen.

PostgreSQL 17.11 requiere autorizar explícitamente el plugin lógico usado por Realtime. La configuración declara `output_plugin_libraries=pgoutput,wal2json`. En SQL los nombres se suministran como dos valores, evitando convertir toda la lista en un único nombre entre comillas. Véase la [referencia oficial](https://www.postgresql.org/docs/17/runtime-config-replication.html).

Se preparan los esquemas operativos `_realtime` y `realtime` antes de arrancar ese servicio. Los permisos de aplicación siguen sujetos a las políticas RLS restauradas.

Storage requiere conservar contenido, propietarios, permisos y atributos extendidos. La copia de bytes por sí sola produjo errores ENODATA; el traslado utiliza archivos tar con atributos y rsync con `-aHAX --numeric-ids`, y verifica las descargas por API.

## Procedimiento del corte

1. Guardar el respaldo cifrado y su material de recuperación fuera del VPS. El conjunto de recuperación contiene una base inicial y el archivo final con la base actualizada y los cambios de Storage.
2. Pausar despliegues automáticos, mostrar mantenimiento y detener escritores de la web y APIs originales. Mantener la base original protegida frente a escrituras accidentales.
3. Capturar un snapshot de solo lectura; generar los volcados final completo y de aplicación. Comparar la restauración en el destino antes de arrancar sus servicios.
4. Conciliar todas las filas de las tablas de negocio, Auth, Storage y los esquemas privados mediante hashes con orden explícito C, además de esquemas, restricciones, políticas, funciones, secuencias y totales. Verificar archivos y atributos.
5. Aplicar el directorio acotado de técnicos, preparar Realtime y vaciar exclusivamente el caché nuevo.
6. Comprobar el destino y terminar el respaldo externo. Actualizar el recurso y dominios de Dokploy.
7. Cambiar juntos los routers de web y API. Desde ese momento toda escritura pertenece al PostgreSQL nuevo. Retirar mantenimiento y verificar el dominio público.

El estado operativo y la evidencia privada están bajo `/opt/motomanager-production`. El sistema anterior se conserva detenido para recuperación; no se mezclan sus volúmenes con los nuevos.

## Reversión después de abrir escrituras

**No apuntar la API a la base antigua después de aceptar escrituras en la nueva.** La base anterior se vuelve obsoleta en cuanto se abre el tráfico.

Si falla la nueva versión de la web, se puede activar la versión anterior conservando el gateway y la base nuevos:

```bash
python3 infra/dokploy/rollback-web.py
```

El helper comprueba el estado del corte, arranca la web previa, espera a que responda y cambia solamente su router. La API sigue apuntando a `motomanager-production-gateway:8000`; las escrituras nuevas se conservan.

Una reversión de datos requiere otra pausa, copia y conciliación desde la base nueva. El respaldo previo al corte no sustituye esas escrituras.
