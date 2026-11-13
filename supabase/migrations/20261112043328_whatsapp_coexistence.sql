-- Additive and disabled by default. Credentials are encrypted in the application
-- with a dedicated key; neither secrets nor inbox data are exposed through REST.
BEGIN;
CREATE SCHEMA IF NOT EXISTS motomanager_private;
CREATE TABLE motomanager_private.whatsapp_connections (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_id text NOT NULL UNIQUE CHECK(waba_id ~ '^[0-9]{5,30}$'),
  phone_id text NOT NULL UNIQUE CHECK(phone_id ~ '^[0-9]{5,30}$'),
  display_phone text NOT NULL, verified_name text NOT NULL,
  token_ciphertext text NOT NULL, token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'setting_up' CHECK(status IN ('setting_up','syncing','pending_templates','active','reconnect_required','paused')),
  details jsonb NOT NULL DEFAULT '{}', connected_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE motomanager_private.whatsapp_signup_sessions (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id), state_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  claimed_at timestamptz
);
CREATE TABLE motomanager_private.whatsapp_events (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_hash text NOT NULL, field text NOT NULL, payload_ciphertext text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,event_hash)
);
CREATE TABLE motomanager_private.whatsapp_messages (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message_id text NOT NULL, occurred_at timestamptz NOT NULL,
  payload_ciphertext text NOT NULL, PRIMARY KEY(organization_id,message_id)
);
CREATE INDEX whatsapp_messages_timeline_idx ON motomanager_private.whatsapp_messages(organization_id,occurred_at DESC,message_id DESC);
ALTER TABLE motomanager_private.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.whatsapp_signup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.whatsapp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.whatsapp_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON motomanager_private.whatsapp_connections,motomanager_private.whatsapp_signup_sessions,
  motomanager_private.whatsapp_events,motomanager_private.whatsapp_messages FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA motomanager_private TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON motomanager_private.whatsapp_connections,motomanager_private.whatsapp_signup_sessions,
  motomanager_private.whatsapp_events,motomanager_private.whatsapp_messages TO service_role;

-- Only the trusted server can call this narrow dispatcher. SECURITY INVOKER
-- preserves the caller's privileges; browser roles have neither table nor RPC access.
CREATE FUNCTION public.whatsapp_service(p_action text,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE org uuid; actor uuid; c motomanager_private.whatsapp_connections; result jsonb;
  patch jsonb; item jsonb; inserted text; current_status text; next_progress integer;
BEGIN
  IF p_action='find' THEN
    SELECT to_jsonb(x) INTO result FROM motomanager_private.whatsapp_connections x WHERE x.waba_id=p_data->>'waba';
    RETURN result;
  END IF;
  org=(p_data->>'org')::uuid;
  IF org IS NULL THEN RAISE EXCEPTION 'Workshop required' USING ERRCODE='22023'; END IF;
  IF p_action IN ('begin','claim','save') THEN
    actor=(p_data->>'actor')::uuid;
    IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_members m
        WHERE m.organization_id=org AND m.user_id=actor AND m.status='active' AND m.role IN ('owner','admin')) THEN
      RAISE EXCEPTION 'Workshop administrator required' USING ERRCODE='42501';
    END IF;
  END IF;
  IF p_action='begin' THEN
    IF p_data->>'hash' !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid signup state'; END IF;
    INSERT INTO motomanager_private.whatsapp_signup_sessions(organization_id,actor_id,state_hash,expires_at)
      VALUES(org,actor,p_data->>'hash',now()+interval '10 minutes')
    ON CONFLICT(organization_id) DO UPDATE SET actor_id=EXCLUDED.actor_id,state_hash=EXCLUDED.state_hash,
      created_at=now(),expires_at=EXCLUDED.expires_at,claimed_at=NULL
      WHERE whatsapp_signup_sessions.created_at < now()-interval '5 seconds';
    IF NOT FOUND THEN RAISE EXCEPTION 'Wait before starting another signup'; END IF;
    RETURN 'true'::jsonb;
  ELSIF p_action='claim' THEN
    UPDATE motomanager_private.whatsapp_signup_sessions SET claimed_at=now()
      WHERE organization_id=org AND actor_id=actor AND state_hash=p_data->>'hash' AND claimed_at IS NULL AND expires_at>now();
    RETURN to_jsonb(FOUND);
  ELSIF p_action='save' THEN
    IF NOT EXISTS(SELECT 1 FROM motomanager_private.whatsapp_signup_sessions s WHERE s.organization_id=org AND s.actor_id=actor AND s.claimed_at>now()-interval '3 minutes') THEN
      RAISE EXCEPTION 'Claimed signup required' USING ERRCODE='42501';
    END IF;
    IF length(p_data->>'token') NOT BETWEEN 40 AND 20000 THEN RAISE EXCEPTION 'Invalid credential'; END IF;
    SELECT * INTO c FROM motomanager_private.whatsapp_connections WHERE organization_id=org FOR UPDATE;
    INSERT INTO motomanager_private.whatsapp_connections(organization_id,waba_id,phone_id,display_phone,verified_name,token_ciphertext,token_expires_at,connected_by,details)
    VALUES(org,p_data->>'waba',p_data->>'phone',p_data->>'number',p_data->>'name',p_data->>'token',(p_data->>'expires')::timestamptz,actor,
      CASE WHEN c.phone_id=p_data->>'phone' AND c.waba_id=p_data->>'waba' AND coalesce(c.details->>'connectionRevoked','false')<>'true'
        THEN '{"history":"pending","progress":0}'::jsonb || (coalesce(c.details,'{}')-'subscribed'-'issue')
        ELSE '{"history":"pending","progress":0}'::jsonb END)
    ON CONFLICT(organization_id) DO UPDATE SET waba_id=EXCLUDED.waba_id,phone_id=EXCLUDED.phone_id,
      display_phone=EXCLUDED.display_phone,verified_name=EXCLUDED.verified_name,token_ciphertext=EXCLUDED.token_ciphertext,
      token_expires_at=EXCLUDED.token_expires_at,connected_by=actor,status='setting_up',details=EXCLUDED.details,updated_at=now();
    -- A different number must never inherit the previous number's conversations.
    IF c.phone_id IS DISTINCT FROM p_data->>'phone' THEN
      DELETE FROM motomanager_private.whatsapp_messages WHERE organization_id=org;
    END IF;
    DELETE FROM motomanager_private.whatsapp_events WHERE organization_id=org;
    RETURN 'true'::jsonb;
  ELSIF p_action='get' THEN
    SELECT to_jsonb(x) INTO result FROM motomanager_private.whatsapp_connections x WHERE x.organization_id=org;
    RETURN result;
  ELSIF p_action='messages' THEN
    SELECT coalesce(jsonb_agg(x ORDER BY x.occurred_at DESC,x.message_id DESC),'[]') INTO result FROM
      (SELECT payload_ciphertext,occurred_at,message_id FROM motomanager_private.whatsapp_messages
       WHERE organization_id=org AND (p_data->>'before' IS NULL OR
         (occurred_at,message_id)<((p_data->>'before')::timestamptz,p_data->>'beforeId'))
       ORDER BY occurred_at DESC,message_id DESC LIMIT 50) x;
    RETURN result;
  ELSIF p_action IN ('patch','ingest') THEN
    SELECT * INTO c FROM motomanager_private.whatsapp_connections WHERE organization_id=org FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF p_action='ingest' THEN
      IF c.phone_id IS DISTINCT FROM p_data->>'phone' THEN RETURN 'false'::jsonb; END IF;
      INSERT INTO motomanager_private.whatsapp_events(organization_id,event_hash,field,payload_ciphertext)
        VALUES(org,p_data->>'hash',p_data->>'field',p_data->>'payload') ON CONFLICT DO NOTHING RETURNING event_hash INTO inserted;
      IF inserted IS NULL THEN RETURN 'false'::jsonb; END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_data->'messages','[]')) LOOP
        INSERT INTO motomanager_private.whatsapp_messages(organization_id,message_id,occurred_at,payload_ciphertext)
          VALUES(org,item->>'id',(item->>'timestamp')::timestamptz,item->>'payload') ON CONFLICT DO NOTHING;
      END LOOP;
      IF p_data->>'disconnected'='true' THEN c.status='reconnect_required'; c.details=c.details||'{"issue":"authorization","connectionRevoked":true}'; END IF;
      IF p_data->>'field'='history' THEN
        next_progress=greatest(coalesce((c.details->>'progress')::integer,0),least(coalesce((p_data->>'progress')::integer,0),100));
        c.details=c.details||jsonb_build_object('progress',next_progress);
        IF p_data->>'declined'='true' THEN c.details=c.details||'{"history":"declined"}';
        ELSIF next_progress=100 THEN c.details=c.details||'{"history":"complete"}'; END IF;
      END IF;
    ELSE
      patch=p_data->'patch';
      IF patch ? 'status' THEN c.status=patch->>'status'; END IF;
      c.details=c.details||coalesce(patch->'details','{}');
    END IF;
    -- Locked merge prevents late webhooks/template refreshes from undoing a pause,
    -- revocation, or an already completed history sync.
    IF c.status NOT IN ('paused','reconnect_required') THEN
      IF c.details->>'subscribed' IS DISTINCT FROM 'true' THEN c.status='setting_up';
      ELSIF coalesce(c.details->>'history','pending') NOT IN ('complete','declined') THEN c.status='syncing';
      ELSIF c.details->'templates' @> '{"order":"APPROVED","quote":"APPROVED","receipt":"APPROVED","appointment":"APPROVED"}' THEN c.status='active';
      ELSE c.status='pending_templates'; END IF;
    END IF;
    UPDATE motomanager_private.whatsapp_connections SET status=c.status,details=c.details,updated_at=now() WHERE organization_id=org;
    RETURN to_jsonb(c);
  END IF;
  RAISE EXCEPTION 'Unknown WhatsApp action' USING ERRCODE='22023';
END;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_service(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_service(text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
