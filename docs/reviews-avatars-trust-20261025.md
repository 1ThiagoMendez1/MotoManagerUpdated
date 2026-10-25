# Perfiles, fotos y reputación verificable — MotoManager

## Cliente, después de entregar una motocicleta
- Accede con correo verificado al QR y Mi garaje, en `/clientes`.
- Puede cargar imagen JPG/PNG/WebP ≤2MB a su perfil privado.
- Solo las órdenes marcadas `delivered` o `delivered_quote_rejected` y
  asociadas a la cuenta verificada ofrecen el formulario «¿Cómo te fue?».
- Calificación 1-5, respuesta «¿Recomendarías?», texto libre opcional
  (hasta 700 caracteres) y casilla **desmarcada por defecto** para publicar
  comentario anónimo. La valoración agregada se usa públicamente;
  la foto/nombre y comentarios no autorizados nunca son públicos.
- Una reseña por orden; el cliente puede corregirla sin generar duplicados.
- Después de guardar, el cliente puede recomendar voluntariamente el taller
  mediante un enlace de WhatsApp (sin envíos automáticos).
- Si la cuenta aún no está vinculada a una orden, no puede valorar.

## Taller
- `/dashboard/profile` ofrece carga de avatar para dueño/miembro.
- Solo dueño/admin puede entrar a `/dashboard/reviews`: reputación real,
  porcentaje de recomendación y comentarios, incluidas reseñas negativas.
- No existe edición ni eliminación de estrellas de los clientes por el taller.
- `/planes` y `/talleres/[slug]` muestran promedios reales y,
  si existe consentimiento, un comentario anónimo reciente.
- Sin opiniones, la UI dice «Aún sin reseñas verificadas» y no presenta
  estrellas o cifras aleatorias.

## Seguridad
- `customer_service_reviews`: tabla protegida con RLS sin acceso directo a
  `authenticated` ni `anon`. RPC `submit_verified_service_review`
  es SECURITY DEFINER, valida auth.uid, confirmación de correo,
  tenencia org/cliente mediante workshop_customer_accounts, y
  estado entregado de la orden. Índice UNIQUE(work_order_id).
- La función agregada `get_public_workshop_reputation` es
  invocable solo por `service_role`; retorna promedio, total,
  recomendaciones y último comentario con publish_comment=true.
- `profile-avatars`: bucket privado, acceso solo vía server action
  autenticada; contenido validado por firmas JPG/PNG/WebP, MIME y tamaño.
  El perfil `profiles.avatar_path` apunta exclusivamente a un objeto bajo
  el ID del usuario. Los URLs son temporales, firmados por 1 hora.
- No se exponen nombres, teléfonos, placas o fotos en tarjetas de reseña.
- No se envían WhatsApps de prueba a clientes ni avisos masivos.

## Validación y despliegue
- Migración `supabase/migrations/20261025060000_verified_reviews_profile_avatars.sql`.
- Prueba SQL `tests/verified-reviews-regression.sql`, correr con BEGIN/ROLLBACK
  en PostgreSQL aislado restaurado. Comprueba creación, actualización, media,
  comentarios privados/publicados, permisos cross-user y estado no entregado.
- Respaldar `postgres`, `_supabase`, roles y Storage y verificar antes
  de aplicar migración. No modificar Dokploy PG16.
- Desplegar después de pruebas Next.js, rutas públicas y permisos.
- Revisar en UX: foto privada y renovaciones de URL firmada, mensaje de
  error para archivos grandes, reseñas negativas visibles y consentimiento.
- Limitaciones: no se generan mensajes WhatsApp automáticos para solicitar
  opinión; enviar invitaciones requiere otra plantilla aprobada por Meta
  y opt-in del destinatario. El ranking debe auditarse periódicamente.
