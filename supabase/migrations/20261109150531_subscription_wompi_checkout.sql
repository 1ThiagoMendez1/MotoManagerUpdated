-- Immutable quotes connect the authenticated workshop checkout to Wompi's event.
-- No existing workshop, subscription, payment or review is changed on installation.
CREATE TABLE motomanager_private.workshop_subscription_checkouts (
  reference text PRIMARY KEY CHECK (reference ~ '^MM-SUB-[a-f0-9]{32}$'),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  plan text NOT NULL CHECK (plan IN ('basic','pro','full')),
  cycle text NOT NULL CHECK (cycle IN ('monthly','biannual','yearly')),
  amount_in_cents bigint NOT NULL CHECK (amount_in_cents BETWEEN 150000 AND 9007199254740991),
  customer_email text NOT NULL,
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','PENDING','APPROVED','DECLINED','ERROR','VOIDED')),
  transaction_id text UNIQUE,
  payment_method_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workshop_subscription_checkouts_org_created ON motomanager_private.workshop_subscription_checkouts(organization_id,created_at DESC);
CREATE INDEX workshop_subscription_checkouts_created ON motomanager_private.workshop_subscription_checkouts(created_at DESC);
ALTER TABLE motomanager_private.workshop_subscription_checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON motomanager_private.workshop_subscription_checkouts FROM PUBLIC,anon,authenticated;
GRANT ALL ON motomanager_private.workshop_subscription_checkouts TO service_role;

CREATE FUNCTION public.create_workshop_subscription_checkout(
  p_reference text,p_organization_id uuid,p_actor_id uuid,p_plan text,p_cycle text,p_amount_in_cents bigint,p_email text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE checkout motomanager_private.workshop_subscription_checkouts; config jsonb;
BEGIN
  SELECT settings INTO config FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id
    WHERE m.organization_id=p_organization_id AND m.user_id=p_actor_id AND m.status='active'
      AND m.role IN ('owner','admin') AND lower(trim(u.email))=lower(trim(p_email))) THEN
    RAISE EXCEPTION 'Workshop owner or administrator required' USING ERRCODE='42501';
  END IF;
  IF config->>'trialReviewPaused'='true' THEN RAISE EXCEPTION 'Trial under review' USING ERRCODE='42501'; END IF;
  -- Repeated clicks reuse an unsubmitted quote, instead of creating duplicate payments.
  SELECT * INTO checkout FROM motomanager_private.workshop_subscription_checkouts
    WHERE organization_id=p_organization_id AND actor_id=p_actor_id AND plan=p_plan AND cycle=p_cycle
      AND amount_in_cents=p_amount_in_cents AND status='CREATED' AND created_at>now()-interval '15 minutes'
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(checkout); END IF;
  IF (SELECT count(*) FROM motomanager_private.workshop_subscription_checkouts
      WHERE organization_id=p_organization_id AND created_at>now()-interval '10 minutes') >= 20 THEN
    RAISE EXCEPTION 'Too many checkout attempts' USING ERRCODE='54000';
  END IF;
  INSERT INTO motomanager_private.workshop_subscription_checkouts(reference,organization_id,actor_id,plan,cycle,amount_in_cents,customer_email)
    VALUES(p_reference,p_organization_id,p_actor_id,p_plan,p_cycle,p_amount_in_cents,lower(trim(p_email))) RETURNING * INTO checkout;
  RETURN to_jsonb(checkout);
END $$;

CREATE FUNCTION public.get_workshop_subscription_checkout(p_reference text,p_organization_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT to_jsonb(c) FROM motomanager_private.workshop_subscription_checkouts c
    WHERE c.reference=p_reference AND (p_organization_id IS NULL OR c.organization_id=p_organization_id)
$$;

CREATE FUNCTION public.apply_workshop_subscription_payment(
  p_reference text,p_transaction_id text,p_status text,p_amount_in_cents bigint,p_currency text,p_email text,p_method text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE checkout motomanager_private.workshop_subscription_checkouts; org uuid;
BEGIN
  SELECT organization_id INTO org FROM motomanager_private.workshop_subscription_checkouts WHERE reference=p_reference;
  IF org IS NULL THEN RAISE EXCEPTION 'Unknown checkout' USING ERRCODE='22023'; END IF;
  -- Always acquire organization then checkout, in the same order as quote creation.
  PERFORM 1 FROM public.organizations WHERE id=org FOR UPDATE;
  SELECT * INTO checkout FROM motomanager_private.workshop_subscription_checkouts WHERE reference=p_reference FOR UPDATE;
  IF p_transaction_id IS NULL OR p_transaction_id !~ '^[a-zA-Z0-9-]{1,150}$' OR
     p_status NOT IN ('PENDING','APPROVED','DECLINED','ERROR','VOIDED') OR
     p_currency IS DISTINCT FROM 'COP' OR p_amount_in_cents IS DISTINCT FROM checkout.amount_in_cents OR
     lower(trim(p_email)) IS DISTINCT FROM checkout.customer_email THEN
    RAISE EXCEPTION 'Payment does not match checkout' USING ERRCODE='22023';
  END IF;
  IF checkout.status='APPROVED' THEN
    IF checkout.transaction_id IS DISTINCT FROM p_transaction_id THEN
      RAISE EXCEPTION 'Checkout already paid with another transaction' USING ERRCODE='23505';
    END IF;
    RETURN jsonb_build_object('status','APPROVED','plan',checkout.plan,'cycle',checkout.cycle,'alreadyApplied',true);
  END IF;
  IF checkout.transaction_id IS NOT NULL AND checkout.transaction_id<>p_transaction_id THEN
    RAISE EXCEPTION 'Checkout belongs to another transaction' USING ERRCODE='23505';
  END IF;
  -- A delayed pending event must not overwrite a terminal result.
  IF p_status='PENDING' AND checkout.status IN ('DECLINED','ERROR','VOIDED') THEN
    RETURN jsonb_build_object('status',checkout.status,'plan',checkout.plan,'cycle',checkout.cycle);
  END IF;
  IF p_status='APPROVED' THEN
    PERFORM public.activate_verified_workshop_subscription(checkout.organization_id,checkout.plan,checkout.cycle,
      checkout.amount_in_cents::numeric/100,p_transaction_id);
  END IF;
  UPDATE motomanager_private.workshop_subscription_checkouts SET status=p_status,transaction_id=p_transaction_id,
    payment_method_type=p_method,updated_at=now() WHERE reference=p_reference;
  RETURN jsonb_build_object('status',p_status,'plan',checkout.plan,'cycle',checkout.cycle);
END $$;

-- The admin reads the canonical verified ledger, including landing registrations.
-- Pending/rejected checkouts are visible without granting browser access to private tables.
CREATE FUNCTION public.admin_list_workshop_subscription_payments()
RETURNS TABLE(id text,workshop_id uuid,wompi_transaction_id text,amount numeric,status text,
  payment_method_type text,created_at timestamptz,plan text,cycle text,workshop_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT * FROM (
    SELECT p.transaction_id,p.organization_id,p.transaction_id,p.amount,'APPROVED'::text,
      coalesce(c.payment_method_type,'Wompi'),p.created_at,p.plan,p.cycle,o.name
    FROM motomanager_private.workshop_subscription_payments p
    JOIN public.organizations o ON o.id=p.organization_id
    LEFT JOIN motomanager_private.workshop_subscription_checkouts c ON c.transaction_id=p.transaction_id
    UNION ALL
    SELECT c.reference,c.organization_id,c.transaction_id,c.amount_in_cents::numeric/100,
      CASE WHEN c.status='CREATED' THEN 'PENDING' ELSE c.status END,
      coalesce(c.payment_method_type,'Wompi'),c.created_at,c.plan,c.cycle,o.name
    FROM motomanager_private.workshop_subscription_checkouts c
    JOIN public.organizations o ON o.id=c.organization_id
    WHERE NOT EXISTS(SELECT 1 FROM motomanager_private.workshop_subscription_payments p WHERE p.transaction_id=c.transaction_id)
  ) history ORDER BY history.created_at DESC LIMIT 500
$$;

REVOKE ALL ON FUNCTION public.create_workshop_subscription_checkout(text,uuid,uuid,text,text,bigint,text),
  public.get_workshop_subscription_checkout(text,uuid),
  public.apply_workshop_subscription_payment(text,text,text,bigint,text,text,text),
  public.admin_list_workshop_subscription_payments() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_workshop_subscription_checkout(text,uuid,uuid,text,text,bigint,text),
  public.get_workshop_subscription_checkout(text,uuid),
  public.apply_workshop_subscription_payment(text,text,text,bigint,text,text,text),
  public.admin_list_workshop_subscription_payments() TO service_role;
NOTIFY pgrst,'reload schema';
