-- Labels and anonymous navigation counts only; never form values or identities.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE public.web_analytics_events DROP CONSTRAINT web_analytics_trial_milestones_check;
ALTER TABLE public.web_analytics_events ADD CONSTRAINT web_analytics_trial_milestones_check CHECK (
  kind NOT IN ('form_step','form_submit','form_error') OR (
    path='/prueba-gratis' AND target IS NOT NULL AND x IS NULL AND y IS NULL AND depth IS NULL AND seconds IS NULL AND (
      (kind='form_step' AND (target='access' OR target ~ '^field_v1:(workshop|name|email|password|phone):(view|edit|valid|invalid)$')) OR
      (kind='form_submit' AND target='activate') OR
      (kind='form_error' AND target IN ('validation','session_open','rate_limited','rate_unavailable','account_exists',
        'account_failed','trial_used','provision_failed','interrupted','connection'))
    )
  )
) NOT VALID;
ALTER TABLE public.web_analytics_events VALIDATE CONSTRAINT web_analytics_trial_milestones_check;

CREATE FUNCTION public.web_trial_signup_field_diagnostics(p_from timestamptz,p_to timestamptz,p_channel text DEFAULT 'all',p_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR
    p_to<=p_from OR p_to-p_from>interval '90 days' OR p_channel IS NULL OR
    p_channel NOT IN ('all','direct','search_ai','social','referral','ads') OR
    (p_path IS NOT NULL AND p_path NOT IN ('/','/planes','/prueba-gratis','/login','/register-workshop') AND p_path !~ '^/talleres/[a-z0-9][a-z0-9-]{0,79}$') THEN
    RAISE EXCEPTION 'Invalid analytics range or filter' USING ERRCODE='22023';
  END IF;
  WITH events AS MATERIALIZED (
    SELECT e.session_id,e.page_id,e.kind,e.target,e.created_at FROM public.web_analytics_events e
    JOIN public.web_analytics_layouts l ON l.id=e.layout_id
    JOIN public.web_analytics_sessions s ON s.id=e.session_id
    WHERE e.created_at>=p_from AND e.created_at<p_to AND e.path='/prueba-gratis' AND l.variant LIKE 'trial-v2-fields-v1%'
      AND (p_channel='all' OR s.channel=p_channel) AND (p_path IS NULL OR e.path=p_path)
  ), navigation AS (
    SELECT session_id,page_id,bool_or(kind='form_submit') submitted FROM events GROUP BY session_id,page_id
  ), activity AS MATERIALIZED (
    SELECT session_id,page_id,split_part(target,':',2) field,split_part(target,':',3) stage,created_at
    FROM events WHERE kind='form_step' AND target ~ '^field_v1:(workshop|name|email|password|phone):(view|edit|valid|invalid)$'
  ), last_times AS (
    SELECT session_id,page_id,max(created_at) at FROM activity WHERE stage='edit' GROUP BY session_id,page_id
  ), last_edits AS (
    -- Simultaneous autofill edits can tie: do not invent an order between fields.
    SELECT a.session_id,a.page_id,CASE WHEN count(DISTINCT a.field)=1 THEN min(a.field) END field
    FROM activity a JOIN last_times t USING(session_id,page_id) WHERE a.stage='edit' AND a.created_at=t.at
    GROUP BY a.session_id,a.page_id
  ), fields AS (
    SELECT field,ordinal FROM unnest(ARRAY['workshop','name','email','password','phone']) WITH ORDINALITY AS f(field,ordinal)
  ), rows AS (
    SELECT f.field,f.ordinal,
      count(DISTINCT (a.session_id,a.page_id)) FILTER(WHERE a.stage='view') viewed,
      count(DISTINCT (a.session_id,a.page_id)) FILTER(WHERE a.stage='edit') edited,
      count(DISTINCT (a.session_id,a.page_id)) FILTER(WHERE a.stage='valid') valid,
      count(DISTINCT (a.session_id,a.page_id)) FILTER(WHERE a.stage='invalid') invalid,
      (SELECT count(*) FROM last_edits le JOIN navigation n USING(session_id,page_id) WHERE le.field=f.field AND NOT n.submitted) last_without_submit
    FROM fields f LEFT JOIN activity a ON a.field=f.field GROUP BY f.field,f.ordinal
  )
  SELECT jsonb_build_object('available',true,'version','field-v1',
    'firstMeasuredAt',(SELECT min(e.created_at) FROM public.web_analytics_events e JOIN public.web_analytics_layouts l ON l.id=e.layout_id
      WHERE e.path='/prueba-gratis' AND l.variant LIKE 'trial-v2-fields-v1%'),
    'measuredNavigations',(SELECT count(*) FROM navigation),
    'ambiguousLastEdits',(SELECT count(*) FROM last_edits le JOIN navigation n USING(session_id,page_id) WHERE le.field IS NULL AND NOT n.submitted),
    'rows',(SELECT jsonb_agg(jsonb_build_object('field',field,'viewed',viewed,'edited',edited,'valid',valid,'invalid',invalid,'lastWithoutSubmit',last_without_submit) ORDER BY ordinal) FROM rows)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.web_trial_signup_field_diagnostics(timestamptz,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.web_trial_signup_field_diagnostics(timestamptz,timestamptz,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
