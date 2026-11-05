-- Authentic, single-order workshop reviews. Clients submit only after verified delivery.
CREATE TABLE IF NOT EXISTS public.customer_service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL UNIQUE REFERENCES public.work_orders(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  recommended boolean NOT NULL,
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 700),
  publish_comment boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_reviews_public
  ON public.customer_service_reviews(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_reviews_reviewer
  ON public.customer_service_reviews(reviewer_user_id, work_order_id);
ALTER TABLE public.customer_service_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_service_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.customer_service_reviews TO service_role;

CREATE OR REPLACE FUNCTION public.submit_verified_service_review(
  p_work_order_id uuid, p_rating integer, p_recommended boolean,
  p_comment text DEFAULT '', p_publish_comment boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  row_data public.work_orders%ROWTYPE;
  normalized_comment text := trim(coalesce(p_comment, ''));
  review_id uuid;
BEGIN
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = actor AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Verifica tu correo para valorar un servicio' USING ERRCODE='42501';
  END IF;
  IF p_work_order_id IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR p_recommended IS NULL
     OR char_length(normalized_comment) > 700 OR p_publish_comment IS NULL THEN
    RAISE EXCEPTION 'Datos de valoración inválidos' USING ERRCODE='22023';
  END IF;
  SELECT w.* INTO row_data
  FROM public.work_orders w
  WHERE w.id=p_work_order_id
    AND w.status IN ('delivered', 'delivered_quote_rejected')
    AND EXISTS (
      SELECT 1 FROM public.workshop_customer_accounts a
      WHERE a.user_id=actor AND a.customer_id=w.customer_id
        AND a.organization_id=w.organization_id
    )
  FOR SHARE;
  IF row_data.id IS NULL THEN
    RAISE EXCEPTION 'Solo puedes valorar órdenes entregadas asociadas a tu cuenta'
      USING ERRCODE='42501';
  END IF;
  INSERT INTO public.customer_service_reviews
    (organization_id, customer_id, work_order_id, reviewer_user_id,
      rating, recommended, comment, publish_comment)
  VALUES (row_data.organization_id, row_data.customer_id, row_data.id, actor,
          p_rating, p_recommended, normalized_comment, p_publish_comment)
  ON CONFLICT (work_order_id) DO UPDATE SET
    rating=EXCLUDED.rating,
    recommended=EXCLUDED.recommended,
    comment=EXCLUDED.comment,
    publish_comment=EXCLUDED.publish_comment,
    updated_at=now()
  WHERE public.customer_service_reviews.reviewer_user_id=actor
  RETURNING id INTO review_id;
  IF review_id IS NULL THEN
    RAISE EXCEPTION 'Esta valoración pertenece a otra cuenta' USING ERRCODE='42501';
  END IF;
  RETURN review_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_verified_service_review(uuid,integer,boolean,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_verified_service_review(uuid,integer,boolean,text,boolean) TO authenticated;

-- The public storefront must never fabricate stars, counts, or endorsements.
-- Only service-role readers of this aggregate may access public reputation data.
CREATE OR REPLACE FUNCTION public.get_public_workshop_reputation()
RETURNS TABLE(organization_id uuid, average_rating numeric, review_count bigint,
  recommendation_count bigint, recent_public_comment text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.organization_id,
         round(avg(r.rating)::numeric,1) AS average_rating,
         count(*)::bigint AS review_count,
         count(*) FILTER (WHERE r.recommended)::bigint AS recommendation_count,
         (SELECT r2.comment FROM public.customer_service_reviews r2
          WHERE r2.organization_id=r.organization_id
            AND r2.publish_comment AND r2.comment <> ''
          ORDER BY r2.created_at DESC, r2.id DESC LIMIT 1) AS recent_public_comment
  FROM public.customer_service_reviews r
  JOIN public.organizations o ON o.id=r.organization_id
  WHERE o.status='active'
  GROUP BY r.organization_id;
$$;
REVOKE ALL ON FUNCTION public.get_public_workshop_reputation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_workshop_reputation() TO service_role;

-- Profile images are private objects, only the authenticated owner via server action
-- can request a signed temporary URL. No client storage grants.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('profile-avatars','profile-avatars',false,2097152,
        ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public=false,
  file_size_limit=2097152,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']::text[];
