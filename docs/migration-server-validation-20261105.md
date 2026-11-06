# Validación del traslado en el VPS — 5 de noviembre de 2026

## Dictamen

La autenticación no impide trasladar las cuentas al PostgreSQL propio. El ensayo en `vmi3462336` restauró los datos reales en una instancia privada de PostgreSQL 17.11 y conservó los UUID, identidades y hashes de las 74 contraseñas. Dos sesiones copiadas se renovaron a través de GoTrue y pudieron consultar su taller. No fue necesario restablecer contraseñas ni enviar códigos a los clientes.

Esto valida un traslado que conserva los contratos actuales de Auth/GoTrue, PostgREST y Storage. **La rama todavía no elimina estos componentes ni conecta Keycloak al login.** Un restablecimiento por WhatsApp resuelve una credencial; no sustituye las APIs, las sesiones y los permisos de la aplicación.

**El corte de producción no se ha ejecutado.** Producción continúa en su despliegue anterior. Solo se crearon recursos privados para el ensayo; al terminar se detuvieron.

## Código y entorno comprobados

- Principal desplegado: `f750d1d40d950f02d9094f8cea4a62abf6b1fd0a`, rama `codex/v6.8.0-horarios-quota-hardening-20261023`.
- Código nuevo validado: `1ba11b19a0ef0e06c16289e1ad3884159c6b04cb`, rama `codex/v6.8.0-redis-navigation-20261028`.
- La web pública de staging seguía montando el release anterior `3aKtlJnZtU_4c_ZbKBz8m`. Tener el merge en Git no había actualizado ese montaje.
- PostgreSQL del ensayo: `postgres:17.11-bookworm`, separado de producción, de las bases ficticias y de la base de Dokploy.
- Misma versión de Auth en origen y ensayo: `supabase/gotrue:v2.189.0`. PostgREST `v14.12`; Storage `v1.60.4`.
- Red privada nueva con `internal=true`, sin puertos públicos. Sin SMTP ni emisor WhatsApp configurados para el ensayo.

## Datos e integridad

| Elemento | Resultado comprobado |
| --- | --- |
| Cuentas Auth | 74; los 74 hashes bcrypt conservados |
| Talleres | 10 |
| Clientes | 212 |
| Motocicletas | 216 |
| Órdenes | 77 |
| Tablas de aplicación, Auth y Storage | 79, con todos sus valores iguales antes de ejecutar servicios y cambios en la copia |
| Estructuras, restricciones, RLS, políticas, funciones, secuencias y totales | Informe de conciliación igual antes de ejecutar servicios y cambios |
| Propietarios y ACL de aplicación | 355 objetos comparados con ACL normalizadas; iguales tras preservar el permiso original de uso del esquema público |
| Archivos | 43; 24.852.547 bytes; contenido copiado idéntico |
| Atributos extendidos de archivos | 86 atributos copiados y comprobados |
| Descargas mediante Storage | 43 de 43 descargados y verificados por hash |

Se exportó un snapshot de PostgreSQL de solo lectura, compartido por el volcado completo, el volcado de aplicación y las comprobaciones del origen. Los servicios de destino estuvieron detenidos durante la conciliación inicial. El volcado de aplicación incluye `auth`, `public`, `storage`, `private`, `motomanager_private` y `extensions`, con las extensiones compatibles necesarias.

El volcado completo se conserva por separado. No se debe restaurar indiscriminadamente todo ese archivo sobre PostgreSQL estándar: contiene componentes internos como `pg_net`, Vault y Realtime. Vault tenía cero secretos. Los componentes omitidos del ensayo no quedan validados como servicios de destino por haber pasado la conciliación de aplicación.

Se generaron copias cifradas de los volcados y del archivo de Storage con sus atributos; se comprobó que su descifrado devuelve los mismos bytes. **Estas copias permanecen en el VPS; el respaldo externo sigue pendiente antes del corte.** Secretos, dumps y datos privados no se añadieron a Git.

## Pruebas funcionales realizadas en la copia

- Renovación de dos sesiones reales copiadas de talleres diferentes y validación de usuario con GoTrue.
- Lectura de clientes de cada taller mediante PostgREST; rechazo de la consulta del otro taller y del acceso anónimo.
- Creación de una cuenta ficticia, login con contraseña y eliminación de esa cuenta; sin correos ni WhatsApp externos.
- Descarga de todos los archivos mediante Storage después de conservar sus atributos.
- Aplicación **solo en la copia** de `20261028200000_scoped_technician_directory.sql`, ausente en producción y única migración adicional de la rama nueva. RPC comprobada con paginación, totales, acceso al taller propio y rechazo de otro taller y del anónimo. Las tablas de prueba gratuita y analítica ya estaban en el volcado; no se repitieron sus migraciones.
- Suite general: 133 aprobadas, cero fallos y dos pruebas Redis omitidas en esa ejecución.
- Suite de Redis real: las dos pruebas aprobadas, incluida invalidación y separación de escrituras de analítica.
- TypeScript aprobado.
- Build de producción aprobado con Node 24.22.1 y Next.js 15.5.28. Este build usa configuración aislada; no se desplegó en producción.

## Detalles que deben conservarse en el traslado final

1. **Storage necesita sus atributos extendidos.** Una copia que conservaba los bytes pero omitía los atributos devolvía HTTP 500 `ENODATA`. Después de copiar los 86 atributos, las 43 descargas pasaron. Utilizar un método que preserve atributos, permisos y propietarios, como GNU tar con `--xattrs --acls --numeric-owner`; verificar también la descarga por API.
2. El origen usa ordenamiento ICU `en-US`; la base PostgreSQL estándar del primer ensayo usaba libc. Comparar agregados ordenados con proveedores distintos produjo falsos cambios. Al comparar con ICU compatible coincidieron los valores de las 79 tablas. Crear el destino con el proveedor y locale adecuados o definir explícitamente un orden determinista en la conciliación.
3. Al recrear el esquema `public`, preservar también el `USAGE` original para `PUBLIC`; los permisos explícitos de los roles no sustituyen la comprobación de las ACL completas. Recrear las extensiones bajo sus propietarios originales: los miembros de extensión se excluyeron de la comparación de los 355 objetos de aplicación.
4. Las claves JWT de producción y del staging existente son diferentes. El ensayo de sesiones usó las claves del origen exclusivamente en su red privada. Para conservar sesiones en producción hacen falta las claves y registros de sesión compatibles, además del mismo dominio público y la configuración de cookies/SDK; copiar usuarios solamente no demuestra esa continuidad.
5. Hay 33 cuentas sin teléfono en el perfil y cinco grupos de teléfonos repetidos. No sirve imponer un flujo universal de recuperación por teléfono sin resolver esas cuentas y vincular correctamente cada identidad.
6. El formulario de login llama a `/api/auth/forgot-password`, pero en el árbol validado no existe su implementación. Los OTP de Mi Garaje o del registro QR no prueban un restablecimiento de contraseña de los usuarios del taller. Además, el contenedor web actual no tenía configurada `MOBILE_OTP_PEPPER`, requerida por el módulo OTP móvil. La entrega externa de códigos no se probó.
7. Keycloak está instalado, pero no hay integración en `src`. No importar cuentas reales suponiendo que el login ya lo utiliza.

## Pendientes para pasar a producción

1. Completar Realtime en el destino y comprobar las suscripciones de órdenes, notificaciones, cotizaciones y tickets. La rama aún las utiliza y el manifiesto actual no despliega ese servicio.
2. Preparar el release con las URLs y configuración reales de producción, los roles de servicio acotados, Auth, Storage, OTP, SMTP, WhatsApp y pagos. El build de ensayo usa configuración aislada; no es un release para servir directamente a clientes.
3. Guardar fuera del VPS el respaldo cifrado y el material de recuperación por un canal protegido.
4. Detener escrituras de web, móvil, cron y webhooks durante la copia final consistente; repetir la conciliación, el traslado de archivos con metadatos y la migración SQL del directorio.
5. Arrancar el destino y comprobar acceso, operaciones, archivos, Realtime e invalidación de Redis antes de cambiar el tráfico. Mantener una reversión que reconcilie cualquier escritura aceptada en el destino.

La prueba demuestra que **Supabase Auth no exige bloquear el traslado ni obligar a cambiar las contraseñas**. El cambio completo del proveedor de autenticación es otro trabajo que la rama actual todavía no implementa.
