-- New funnel cohorts never reinterpret the old autofocus-based form_start.
-- Form milestones contain allowlisted labels, never field values/coordinates.
BEGIN;
ALTER TABLE public.web_analytics_events DROP CONSTRAINT web_analytics_events_kind_check;
ALTER TABLE public.web_analytics_events ADD CONSTRAINT web_analytics_events_kind_check
  CHECK (kind IN ('pageview','click','scroll','engagement','form_start','form_step','form_submit','form_error'));
ALTER TABLE public.web_analytics_events ADD CONSTRAINT web_analytics_trial_milestones_check CHECK (
  kind NOT IN ('form_step','form_submit','form_error') OR (
    path='/prueba-gratis' AND target IS NOT NULL AND x IS NULL AND y IS NULL AND depth IS NULL AND seconds IS NULL AND (
      (kind='form_step' AND target='access') OR (kind='form_submit' AND target='activate') OR
      (kind='form_error' AND target IN ('validation','session_open','rate_limited','rate_unavailable','account_exists',
        'account_failed','trial_used','provision_failed','interrupted','connection'))
    )
  )
);

-- Daily service-health counters: no user/session/visitor/IP/phone/email columns.
CREATE TABLE private.trial_signup_failures (
  day date NOT NULL,
  code text NOT NULL CHECK (code IN ('session_open','rate_limited','rate_unavailable','account_exists',
    'account_failed','trial_used','provision_failed','interrupted')),
  attempts bigint NOT NULL DEFAULT 1 CHECK (attempts>0),
  PRIMARY KEY (day,code)
);
CREATE INDEX IF NOT EXISTS workshop_trial_claims_started ON motomanager_private.workshop_trial_claims(starts_at);
ALTER TABLE private.trial_signup_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.trial_signup_failures FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON private.trial_signup_failures TO service_role;

CREATE FUNCTION public.record_trial_signup_failure(p_code text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  INSERT INTO private.trial_signup_failures(day,code) VALUES((now() AT TIME ZONE 'America/Bogota')::date,p_code)
  ON CONFLICT(day,code) DO UPDATE SET attempts=private.trial_signup_failures.attempts+1;
  DELETE FROM private.trial_signup_failures WHERE day<(now() AT TIME ZONE 'America/Bogota')::date-90;
END $$;

CREATE FUNCTION public.web_trial_signup_diagnostics(p_from timestamptz,p_to timestamptz,p_channel text DEFAULT 'all',p_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR
    p_to<=p_from OR p_to-p_from>interval '90 days' OR p_channel IS NULL OR
    p_channel NOT IN ('all','direct','search_ai','social','referral','ads') THEN
    RAISE EXCEPTION 'Invalid analytics range' USING ERRCODE='22023';
  END IF;
  WITH events AS MATERIALIZED (
    SELECT e.* FROM public.web_analytics_events e
    JOIN public.web_analytics_layouts l ON l.id=e.layout_id
    JOIN public.web_analytics_sessions s ON s.id=e.session_id
    WHERE e.created_at>=p_from AND e.created_at<p_to AND e.path='/prueba-gratis' AND l.variant LIKE 'trial-v2%'
      AND (p_channel='all' OR s.channel=p_channel) AND (p_path IS NULL OR e.path=p_path)
  ), sessions AS (
    SELECT session_id,bool_or(kind='pageview') arrived,bool_or(kind='form_start') started,
      bool_or(kind='form_step' AND target='access') access_step,bool_or(kind='form_submit') submitted
    FROM events GROUP BY session_id
  )
  SELECT jsonb_build_object('available',true,'version','trial-v2',
    'confirmedTrials',(SELECT count(*) FROM motomanager_private.workshop_trial_claims WHERE starts_at>=p_from AND starts_at<p_to),
    'firstMeasuredAt',(SELECT min(e.created_at) FROM public.web_analytics_events e
      JOIN public.web_analytics_layouts l ON l.id=e.layout_id WHERE e.path='/prueba-gratis' AND l.variant LIKE 'trial-v2%'),
    'visits',(SELECT count(*) FROM sessions WHERE arrived),
    'started',(SELECT count(*) FROM sessions WHERE arrived AND started),
    'accessStep',(SELECT count(*) FROM sessions WHERE arrived AND access_step),
    'submitted',(SELECT count(*) FROM sessions WHERE arrived AND submitted),
    'submitAttempts',(SELECT count(*) FROM events WHERE kind='form_submit'),
    'clientErrors',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',target,'attempts',attempts,'visits',visits) ORDER BY attempts DESC,target),'[]'::jsonb)
      FROM (SELECT target,count(*) attempts,count(DISTINCT session_id) visits FROM events WHERE kind='form_error' GROUP BY target) errors),
    -- These global daily counters are intentionally not attributed to anonymous
    -- navigation or ad campaigns. The UI labels their scope explicitly.
    'serverErrors',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',code,'attempts',attempts) ORDER BY attempts DESC,code),'[]'::jsonb)
      FROM (SELECT code,sum(attempts) attempts FROM private.trial_signup_failures
        WHERE day>=(p_from AT TIME ZONE 'America/Bogota')::date
          AND day<(p_to AT TIME ZONE 'America/Bogota')::date GROUP BY code) errors)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.record_trial_signup_failure(text),
 public.web_trial_signup_diagnostics(timestamptz,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_trial_signup_failure(text),
 public.web_trial_signup_diagnostics(timestamptz,timestamptz,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
