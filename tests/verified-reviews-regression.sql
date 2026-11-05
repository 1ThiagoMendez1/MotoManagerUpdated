DO $verify$
DECLARE
  actor uuid;
  wrong_actor uuid;
  order_id uuid;
  org uuid;
  customer uuid;
  review_id uuid;
  avg_score numeric;
  n_reviews bigint;
  n_recommended bigint;
  public_quote text;
BEGIN
  SELECT w.id,w.organization_id,w.customer_id INTO order_id,org,customer
  FROM public.work_orders w JOIN public.organizations o ON o.id=w.organization_id
  WHERE w.status='delivered' AND o.status='active' LIMIT 1;
  SELECT id INTO actor FROM auth.users WHERE email_confirmed_at IS NOT NULL ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO wrong_actor FROM auth.users WHERE email_confirmed_at IS NOT NULL AND id<>actor LIMIT 1;
  IF order_id IS NULL OR actor IS NULL OR wrong_actor IS NULL THEN RAISE EXCEPTION 'Fixture not found'; END IF;

  INSERT INTO public.workshop_customer_accounts (organization_id,user_id,customer_id)
  VALUES (org,actor,customer);
  PERFORM set_config('request.jwt.claim.sub', actor::text, true);
  review_id:=public.submit_verified_service_review(order_id,2,false,'No cumplió mis expectativas',false);
  IF review_id IS NULL OR (SELECT count(*) FROM public.customer_service_reviews WHERE work_order_id=order_id)<>1
    THEN RAISE EXCEPTION 'Verified review not saved'; END IF;

  SELECT average_rating,review_count,recommendation_count,recent_public_comment
    INTO avg_score,n_reviews,n_recommended,public_quote
  FROM public.get_public_workshop_reputation() WHERE organization_id=org;
  IF avg_score<>2 OR n_reviews<>1 OR n_recommended<>0 OR public_quote IS NOT NULL
    THEN RAISE EXCEPTION 'Incorrect aggregation or private comment exposed'; END IF;

  PERFORM public.submit_verified_service_review(order_id,5,true,'Buena atención',true);
  SELECT average_rating,review_count,recommendation_count,recent_public_comment
    INTO avg_score,n_reviews,n_recommended,public_quote
  FROM public.get_public_workshop_reputation() WHERE organization_id=org;
  IF avg_score<>5 OR n_reviews<>1 OR n_recommended<>1 OR public_quote<>'Buena atención'
    THEN RAISE EXCEPTION 'Update/aggregation/consent mismatch'; END IF;

  PERFORM set_config('request.jwt.claim.sub', wrong_actor::text, true);
  BEGIN
    PERFORM public.submit_verified_service_review(order_id,1,false,'Falsificación',true);
    RAISE EXCEPTION 'SECURITY FAILURE: another account modified review';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claim.sub', actor::text, true);
  UPDATE public.work_orders SET status='diagnosis' WHERE id=order_id;
  BEGIN
    PERFORM public.submit_verified_service_review(order_id,5,true,' ',true);
    RAISE EXCEPTION 'SECURITY FAILURE: review on undelivered order accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF has_table_privilege('authenticated','public.customer_service_reviews','SELECT')
    OR has_function_privilege('authenticated','public.get_public_workshop_reputation()','EXECUTE')
    THEN RAISE EXCEPTION 'SECURITY FAILURE: public reputation internals leaked'; END IF;
  RAISE NOTICE 'VERIFIED_REVIEW_TENANT_RLS_AGGREGATES_PASS';
END $verify$;
