-- Additive access review. No workshop is paused by installing this migration.
BEGIN;

CREATE TABLE motomanager_private.workshop_trial_reviews (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('paused','verified')),
  paused_at timestamptz NOT NULL,
  paused_by uuid NOT NULL REFERENCES auth.users(id),
  remaining_seconds bigint NOT NULL CHECK (remaining_seconds >= 0),
  reason text NOT NULL CHECK (length(reason) BETWEEN 8 AND 1000),
  public_message text NOT NULL CHECK (length(public_message) BETWEEN 30 AND 1000),
  verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);
CREATE TABLE motomanager_private.workshop_trial_review_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('paused','verified')),
  reason text NOT NULL,
  public_message text NOT NULL,
  verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE motomanager_private.workshop_trial_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.workshop_trial_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON motomanager_private.workshop_trial_reviews, motomanager_private.workshop_trial_review_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON motomanager_private.workshop_trial_reviews TO service_role;
GRANT SELECT,INSERT ON motomanager_private.workshop_trial_review_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE motomanager_private.workshop_trial_review_events_id_seq TO service_role;
GRANT SELECT(raw_app_meta_data) ON auth.users TO service_role;
CREATE INDEX workshop_trial_review_events_org_idx ON motomanager_private.workshop_trial_review_events(organization_id,created_at DESC);

-- These two narrowly scoped definer functions remain in an unexposed schema.
-- They use the same deterministic primary active membership as the web app.
CREATE FUNCTION motomanager_private.is_current_user_trial_paused()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=auth.uid()
      AND (u.raw_app_meta_data->>'is_super_admin'='true' OR lower(u.email) IN ('juanurian31@gmail.com','mivraadmin@motomanager.com.co')))
    AND EXISTS (SELECT 1 FROM motomanager_private.workshop_trial_reviews r
      WHERE r.status='paused' AND r.organization_id=(
        SELECT m.organization_id FROM public.organization_members m
        WHERE m.user_id=auth.uid() AND m.status='active'
        ORDER BY m.joined_at,m.organization_id LIMIT 1));
$$;
CREATE FUNCTION motomanager_private.current_trial_review()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('organizationId',r.organization_id,'workshopName',o.name,
    'pausedAt',r.paused_at,'message',r.public_message)
  FROM motomanager_private.workshop_trial_reviews r
  JOIN public.organizations o ON o.id=r.organization_id
  WHERE r.status='paused' AND motomanager_private.is_current_user_trial_paused()
    AND r.organization_id=(SELECT m.organization_id FROM public.organization_members m
      WHERE m.user_id=auth.uid() AND m.status='active'
      ORDER BY m.joined_at,m.organization_id LIMIT 1);
$$;
REVOKE ALL ON FUNCTION motomanager_private.is_current_user_trial_paused(),motomanager_private.current_trial_review() FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA motomanager_private TO authenticated;
GRANT EXECUTE ON FUNCTION motomanager_private.is_current_user_trial_paused(),motomanager_private.current_trial_review() TO authenticated;

CREATE FUNCTION public.get_my_trial_review()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT motomanager_private.current_trial_review();
$$;
REVOKE ALL ON FUNCTION public.get_my_trial_review() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_trial_review() TO authenticated;

CREATE FUNCTION public.admin_list_trial_reviews()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'organizationId',organization_id,'status',status,'pausedAt',paused_at,'reviewedAt',reviewed_at,
    'remainingSeconds',remaining_seconds,'reason',reason,'message',public_message,'verification',verification)
    ORDER BY paused_at DESC),'[]'::jsonb)
  FROM motomanager_private.workshop_trial_reviews;
$$;

CREATE FUNCTION public.admin_review_workshop_trial(
  p_actor_id uuid,p_organization_id uuid,p_action text,p_reason text,
  p_public_message text DEFAULT '',p_verification jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE config jsonb; claim motomanager_private.workshop_trial_claims;
  review motomanager_private.workshop_trial_reviews; remaining bigint; new_end timestamptz; k text;
BEGIN
  -- Only a trusted server can invoke this RPC, and the actor must still be a
  -- platform admin in Auth. User-editable metadata never authorizes a review.
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor_id AND
    (raw_app_meta_data->>'is_super_admin'='true' OR lower(email) IN ('juanurian31@gmail.com','mivraadmin@motomanager.com.co'))) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE='42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('pause','verify') OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 8 AND 1000 THEN
    RAISE EXCEPTION 'Invalid review' USING ERRCODE='22023';
  END IF;
  SELECT settings INTO config FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown workshop' USING ERRCODE='22023'; END IF;
  SELECT * INTO claim FROM motomanager_private.workshop_trial_claims WHERE organization_id=p_organization_id FOR UPDATE;
  SELECT * INTO review FROM motomanager_private.workshop_trial_reviews WHERE organization_id=p_organization_id FOR UPDATE;
  IF p_action='pause' THEN
    IF review.status='paused' THEN RETURN jsonb_build_object('paused',true); END IF;
    IF config->>'isTrial' IS DISTINCT FROM 'true' OR claim.organization_id IS NULL OR claim.converted_at IS NOT NULL OR claim.ends_at<=now() THEN
      RAISE EXCEPTION 'A current free trial is required' USING ERRCODE='22023';
    END IF;
    IF p_public_message IS NULL OR length(trim(p_public_message)) NOT BETWEEN 30 AND 1000 THEN
      RAISE EXCEPTION 'Invalid public message' USING ERRCODE='22023';
    END IF;
    remaining=greatest(0,ceil(extract(epoch FROM claim.ends_at-now())))::bigint;
    INSERT INTO motomanager_private.workshop_trial_reviews(organization_id,status,paused_at,paused_by,remaining_seconds,reason,public_message)
    VALUES(p_organization_id,'paused',now(),p_actor_id,remaining,trim(p_reason),trim(p_public_message))
    ON CONFLICT(organization_id) DO UPDATE SET status='paused',paused_at=now(),paused_by=p_actor_id,
      remaining_seconds=EXCLUDED.remaining_seconds,reason=EXCLUDED.reason,public_message=EXCLUDED.public_message,
      verification='{}'::jsonb,reviewed_at=NULL,reviewed_by=NULL;
    UPDATE public.organizations SET settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('trialReviewPaused',true) WHERE id=p_organization_id;
    INSERT INTO motomanager_private.workshop_trial_review_events(organization_id,actor_id,action,reason,public_message)
      VALUES(p_organization_id,p_actor_id,'paused',trim(p_reason),trim(p_public_message));
    RETURN jsonb_build_object('paused',true,'remainingSeconds',remaining);
  END IF;
  IF review.organization_id IS NULL THEN RAISE EXCEPTION 'No pending review' USING ERRCODE='22023'; END IF;
  IF review.status='verified' THEN RETURN jsonb_build_object('paused',false); END IF;
  IF p_verification IS NULL OR jsonb_typeof(p_verification)<>'object' OR
    p_verification->'contacted' IS DISTINCT FROM 'true'::jsonb OR
    p_verification->'locationChecked' IS DISTINCT FROM 'true'::jsonb OR
    p_verification->'evidenceChecked' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION 'Complete the verification checklist' USING ERRCODE='22023';
  END IF;
  FOREACH k IN ARRAY ARRAY['workshopName','city','address','responsibleName','phone','evidence'] LOOP
    IF jsonb_typeof(p_verification->k) IS DISTINCT FROM 'string' OR length(trim(p_verification->>k))<2 THEN
      RAISE EXCEPTION 'Missing verified workshop data' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF length(trim(p_verification->>'workshopName')) NOT BETWEEN 3 AND 120 OR
     length(trim(p_verification->>'city'))>120 OR length(trim(p_verification->>'address')) NOT BETWEEN 5 AND 300 OR
     length(trim(p_verification->>'responsibleName')) NOT BETWEEN 3 AND 120 OR
     length(trim(p_verification->>'evidence')) NOT BETWEEN 10 AND 1000 OR
     p_verification->>'phone' !~ '^[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'Invalid verified workshop data' USING ERRCODE='22023';
  END IF;
  -- Conversion while a review is pending must preserve the paid subscription.
  -- The hold itself only ends through manual verification, never by paying.
  IF claim.organization_id IS NOT NULL AND claim.converted_at IS NULL AND config->>'isTrial'='true' THEN
    new_end=now()+review.remaining_seconds*interval '1 second';
    UPDATE motomanager_private.workshop_trial_claims SET ends_at=new_end WHERE organization_id=p_organization_id;
    config=coalesce(config,'{}'::jsonb)||jsonb_build_object('trialEndDate',new_end,'endDate',new_end,'demoEndDate',new_end);
  END IF;
  UPDATE public.organizations SET name=trim(p_verification->>'workshopName'),phone=p_verification->>'phone',
    settings=coalesce(config,'{}'::jsonb)||jsonb_build_object('trialReviewPaused',false,'city',trim(p_verification->>'city'),'address',trim(p_verification->>'address'))
    WHERE id=p_organization_id;
  UPDATE motomanager_private.workshop_trial_reviews SET status='verified',reviewed_at=now(),reviewed_by=p_actor_id,
    reason=trim(p_reason),verification=p_verification WHERE organization_id=p_organization_id;
  INSERT INTO motomanager_private.workshop_trial_review_events(organization_id,actor_id,action,reason,public_message,verification)
    VALUES(p_organization_id,p_actor_id,'verified',trim(p_reason),review.public_message,p_verification);
  RETURN jsonb_build_object('paused',false,'endsAt',new_end);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_trial_reviews(),public.admin_review_workshop_trial(uuid,uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_trial_reviews(),public.admin_review_workshop_trial(uuid,uuid,text,text,text,jsonb) TO service_role;

-- Restrictive policies combine with existing tenant policies using AND. Even
-- broad legacy policies cannot restore access while an account is under review.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND c.relrowsecurity AND
      (n.nspname='public' OR (n.nspname='storage' AND c.relname='objects'))
  LOOP
    EXECUTE format('CREATE POLICY trial_review_access ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT (SELECT motomanager_private.is_current_user_trial_paused())) WITH CHECK (NOT (SELECT motomanager_private.is_current_user_trial_paused()))',t.nspname,t.relname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_organization_member(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.organization_members WHERE organization_id=org_id AND user_id=auth.uid() AND status='active'
  ) AND NOT EXISTS(
    SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE organization_id=org_id AND converted_at IS NULL AND ends_at<=now()
  ) AND NOT EXISTS(
    SELECT 1 FROM motomanager_private.workshop_trial_reviews WHERE organization_id=org_id AND status='paused'
  );
$$;

-- Also guard writes made inside existing SECURITY DEFINER RPCs. Privileged
-- background jobs continue to work; the settings marker suppresses reminders.
CREATE FUNCTION motomanager_private.guard_trial_review_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF motomanager_private.is_current_user_trial_paused() THEN
    RAISE EXCEPTION 'Trial under review' USING ERRCODE='42501';
  END IF;
  IF TG_TABLE_NAME='organizations' AND TG_OP='UPDATE' THEN
    IF auth.uid() IS NOT NULL AND NEW.settings->'trialReviewPaused' IS DISTINCT FROM OLD.settings->'trialReviewPaused' AND
       NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND
         (u.raw_app_meta_data->>'is_super_admin'='true' OR lower(u.email) IN ('juanurian31@gmail.com','mivraadmin@motomanager.com.co'))) THEN
      RAISE EXCEPTION 'Only administration can change a trial review' USING ERRCODE='42501';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION motomanager_private.guard_trial_review_write() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trial_review_write_guard BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION motomanager_private.guard_trial_review_write();
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables tbl USING(table_schema,table_name)
    WHERE c.table_schema='public' AND c.column_name='organization_id' AND tbl.table_type='BASE TABLE'
  LOOP
    EXECUTE format('CREATE TRIGGER trial_review_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION motomanager_private.guard_trial_review_write()',t.table_name);
  END LOOP;
END $$;

-- PostgREST checks every request, including old JWTs and definer RPC reads.
-- RLS above separately covers Realtime subscriptions and authenticated Storage.
CREATE FUNCTION motomanager_private.check_trial_review_request()
RETURNS void LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF trim(both '/' FROM coalesce(current_setting('request.path',true),''))='rpc/get_my_trial_review' THEN RETURN; END IF;
  IF motomanager_private.is_current_user_trial_paused() THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE='TRIAL_UNDER_REVIEW',HINT='Confirma los datos de tu taller con MotoManager para reactivar la prueba.';
  END IF;
END;
$$;
GRANT USAGE ON SCHEMA motomanager_private TO anon,service_role;
REVOKE ALL ON FUNCTION motomanager_private.check_trial_review_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION motomanager_private.check_trial_review_request() TO anon,authenticated,service_role;
-- Anonymous/service-role requests have no user and return before any private read.
DO $$ DECLARE hook text; BEGIN
  SELECT substr(setting,length('pgrst.db_pre_request=')+1) INTO hook FROM pg_roles r,
    LATERAL unnest(r.rolconfig) setting WHERE r.rolname='authenticator' AND setting LIKE 'pgrst.db_pre_request=%';
  IF coalesce(hook,'') NOT IN ('','motomanager_private.check_trial_review_request') THEN
    RAISE EXCEPTION 'An existing PostgREST pre-request hook must be composed explicitly before installing trial review';
  END IF;
END $$;
ALTER ROLE authenticator SET pgrst.db_pre_request='motomanager_private.check_trial_review_request';
NOTIFY pgrst,'reload config';
NOTIFY pgrst,'reload schema';
COMMIT;
