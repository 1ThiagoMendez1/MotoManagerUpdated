-- First-party analytics. All writes and reports pass through server-side
-- authentication/validation. No browser role can read, write or execute here.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE public.web_analytics_sessions (
  id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  entry_path text NOT NULL,
  last_path text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('direct','search_ai','social','referral','ads')),
  source text, medium text, campaign text, referrer text,
  device text NOT NULL CHECK (device IN ('mobile','desktop','tablet')),
  browser text NOT NULL,
  country text, city text, latitude double precision, longitude double precision,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);
CREATE INDEX web_analytics_visitor_recent ON public.web_analytics_sessions(visitor_id,last_seen DESC);
CREATE INDEX web_analytics_active ON public.web_analytics_sessions(last_seen);
CREATE INDEX web_analytics_session_user ON public.web_analytics_sessions(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE public.web_analytics_layouts (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
  path text NOT NULL, variant text NOT NULL, device text NOT NULL,
  viewport_width integer NOT NULL CHECK (viewport_width BETWEEN 100 AND 10000),
  viewport_height integer NOT NULL CHECK (viewport_height BETWEEN 100 AND 10000),
  width integer NOT NULL CHECK (width BETWEEN 100 AND 20000),
  height integer NOT NULL CHECK (height BETWEEN 100 AND 150000),
  sections jsonb NOT NULL CHECK (jsonb_typeof(sections)='array'),
  last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX web_analytics_layout_pages ON public.web_analytics_layouts(path,device,last_seen DESC);

CREATE TABLE public.web_analytics_events (
  session_id uuid NOT NULL REFERENCES public.web_analytics_sessions(id) ON DELETE CASCADE,
  id uuid NOT NULL, page_id uuid NOT NULL,
  layout_id text NOT NULL REFERENCES public.web_analytics_layouts(id),
  path text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pageview','click','scroll','engagement','form_start')),
  x double precision CHECK (x BETWEEN 0 AND 1), y double precision CHECK (y BETWEEN 0 AND 1),
  target text CHECK (length(target)<=160),
  depth double precision CHECK (depth BETWEEN 0 AND 100),
  seconds double precision CHECK (seconds BETWEEN 0 AND 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id,id),
  CHECK (kind<>'click' OR (x IS NOT NULL AND y IS NOT NULL AND target IS NOT NULL)),
  CHECK (kind<>'scroll' OR depth IS NOT NULL),
  CHECK (kind<>'engagement' OR seconds IS NOT NULL)
);
CREATE INDEX web_analytics_events_period ON public.web_analytics_events(created_at,kind);
CREATE INDEX web_analytics_events_session ON public.web_analytics_events(session_id,created_at);
CREATE INDEX web_analytics_events_heat ON public.web_analytics_events(layout_id,created_at) WHERE kind IN ('click','scroll');

CREATE TABLE public.web_analytics_accesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.web_analytics_sessions(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('login','trial_activated')),
  is_platform_admin boolean NOT NULL DEFAULT false,
  device text NOT NULL, browser text NOT NULL, country text, city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX web_analytics_trial_once ON public.web_analytics_accesses(organization_id)
  WHERE kind='trial_activated';
CREATE INDEX web_analytics_access_period ON public.web_analytics_accesses(created_at DESC);
CREATE INDEX web_analytics_access_user ON public.web_analytics_accesses(user_id);
CREATE INDEX web_analytics_access_session ON public.web_analytics_accesses(session_id) WHERE session_id IS NOT NULL;

CREATE TABLE private.web_analytics_rates (key text NOT NULL, bucket timestamptz NOT NULL, requests integer NOT NULL, PRIMARY KEY(key,bucket));
CREATE TABLE private.web_analytics_batches (visitor_id uuid NOT NULL, batch_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.web_analytics_sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(visitor_id,batch_id));
CREATE INDEX web_analytics_batches_expiry ON private.web_analytics_batches(created_at);
CREATE INDEX web_analytics_batches_session ON private.web_analytics_batches(session_id);

ALTER TABLE public.web_analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_analytics_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_analytics_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.web_analytics_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.web_analytics_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.web_analytics_sessions,public.web_analytics_layouts,public.web_analytics_events,
 public.web_analytics_accesses,private.web_analytics_rates,private.web_analytics_batches FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON public.web_analytics_sessions,public.web_analytics_layouts,public.web_analytics_events,
 public.web_analytics_accesses,private.web_analytics_rates,private.web_analytics_batches TO service_role;

CREATE FUNCTION public.record_web_analytics_batch(p_visitor_id uuid,p_session_id uuid,p_batch_id uuid,
 p_rate_key text,p_meta jsonb,p_layouts jsonb,p_events jsonb,p_user_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,private AS $$
DECLARE sid uuid; old_sid uuid; l jsonb; e jsonb; n integer:=0; affected integer; attempts integer; minute timestamptz:=date_trunc('minute',now());
BEGIN
  IF jsonb_typeof(p_events)<>'array' OR jsonb_array_length(p_events) NOT BETWEEN 1 AND 30 OR
    jsonb_typeof(p_layouts)<>'array' OR jsonb_array_length(p_layouts) NOT BETWEEN 1 AND 8 OR length(p_rate_key)<>64 THEN
    RAISE EXCEPTION 'Invalid analytics batch' USING ERRCODE='22023';
  END IF;
  INSERT INTO private.web_analytics_rates VALUES(p_rate_key,minute,1)
    ON CONFLICT(key,bucket) DO UPDATE SET requests=web_analytics_rates.requests+1 RETURNING requests INTO attempts;
  IF attempts>600 THEN RETURN jsonb_build_object('limited',true); END IF;
  INSERT INTO private.web_analytics_rates VALUES(p_visitor_id::text,minute,1)
    ON CONFLICT(key,bucket) DO UPDATE SET requests=web_analytics_rates.requests+1 RETURNING requests INTO attempts;
  IF attempts>120 THEN RETURN jsonb_build_object('limited',true); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||p_visitor_id::text,0));
  SELECT session_id INTO old_sid FROM private.web_analytics_batches WHERE visitor_id=p_visitor_id AND batch_id=p_batch_id;
  IF old_sid IS NOT NULL THEN RETURN jsonb_build_object('sessionId',old_sid,'inserted',0); END IF;
  -- A single active visit per browser across tabs, even before cookies arrive.
  SELECT id INTO sid FROM public.web_analytics_sessions WHERE visitor_id=p_visitor_id
    AND last_seen>=now()-interval '30 minutes' ORDER BY last_seen DESC LIMIT 1;
  IF sid IS NULL THEN
    sid:=p_session_id;
    INSERT INTO public.web_analytics_sessions(id,visitor_id,entry_path,last_path,channel,source,medium,campaign,referrer,
      device,browser,country,city,latitude,longitude,user_id)
    VALUES(sid,p_visitor_id,p_layouts->0->>'path',p_layouts->0->>'path',p_meta->>'channel',
      p_meta->>'source',p_meta->>'medium',p_meta->>'campaign',p_meta->>'referrer',p_meta->>'device',p_meta->>'browser',
      p_meta->>'country',p_meta->>'city',(p_meta->>'latitude')::double precision,(p_meta->>'longitude')::double precision,p_user_id);
  END IF;
  FOR l IN SELECT value FROM jsonb_array_elements(p_layouts) LOOP
    INSERT INTO public.web_analytics_layouts(id,path,variant,device,viewport_width,viewport_height,width,height,sections)
    VALUES(l->>'id',l->>'path',l->>'variant',p_meta->>'device',(l->>'viewportWidth')::int,(l->>'viewportHeight')::int,
      (l->>'width')::int,(l->>'height')::int,l->'sections')
    ON CONFLICT(id) DO UPDATE SET last_seen=now();
  END LOOP;
  FOR e IN SELECT value FROM jsonb_array_elements(p_events) LOOP
    l:=p_layouts->(e->>'layout')::int;
    IF l IS NULL OR (e->>'ageMs')::int NOT BETWEEN 0 AND 60000 THEN RAISE EXCEPTION 'Invalid analytics event' USING ERRCODE='22023'; END IF;
    INSERT INTO public.web_analytics_events(session_id,id,page_id,layout_id,path,kind,x,y,target,depth,seconds,created_at)
    VALUES(sid,(e->>'id')::uuid,(e->>'pageId')::uuid,l->>'id',l->>'path',e->>'kind',
      (e->>'x')::double precision,(e->>'y')::double precision,e->>'target',(e->>'depth')::double precision,
      (e->>'seconds')::double precision,now()-least((e->>'ageMs')::int,60000)*interval '1 millisecond')
    ON CONFLICT(session_id,id) DO NOTHING;
    GET DIAGNOSTICS affected=ROW_COUNT; n:=n+affected;
  END LOOP;
  IF n>0 THEN
    UPDATE public.web_analytics_sessions SET last_seen=now(),last_path=p_layouts->((p_events->-1->>'layout')::int)->>'path',
      user_id=coalesce(p_user_id,user_id),country=coalesce(country,p_meta->>'country'),city=coalesce(city,p_meta->>'city'),
      latitude=coalesce(latitude,(p_meta->>'latitude')::double precision),longitude=coalesce(longitude,(p_meta->>'longitude')::double precision)
      WHERE id=sid;
  END IF;
  INSERT INTO private.web_analytics_batches(visitor_id,batch_id,session_id) VALUES(p_visitor_id,p_batch_id,sid);
  RETURN jsonb_build_object('sessionId',sid,'inserted',n);
END $$;

CREATE FUNCTION public.record_web_analytics_access(p_user_id uuid,p_kind text,p_organization_id uuid,
 p_session_id uuid,p_visitor_id uuid,p_is_admin boolean,p_meta jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE org uuid; sid uuid;
BEGIN
  IF p_kind NOT IN ('login','trial_activated') THEN RAISE EXCEPTION 'Invalid access event' USING ERRCODE='22023'; END IF;
  SELECT organization_id INTO org FROM public.organization_members WHERE user_id=p_user_id AND status='active'
    AND (p_organization_id IS NULL OR organization_id=p_organization_id) ORDER BY joined_at LIMIT 1;
  IF p_kind='trial_activated' AND (org IS NULL OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=org AND settings->>'isTrial'='true')) THEN RETURN false; END IF;
  IF NOT p_is_admin THEN
    SELECT id INTO sid FROM public.web_analytics_sessions WHERE id=p_session_id AND visitor_id=p_visitor_id
      AND last_seen>=now()-interval '30 minutes';
    UPDATE public.web_analytics_sessions SET user_id=p_user_id WHERE id=sid;
  END IF;
  INSERT INTO public.web_analytics_accesses(user_id,organization_id,session_id,kind,is_platform_admin,device,browser,country,city)
    VALUES(p_user_id,org,sid,p_kind,p_is_admin,p_meta->>'device',p_meta->>'browser',p_meta->>'country',p_meta->>'city')
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

CREATE FUNCTION public.web_analytics_report(p_from timestamptz,p_to timestamptz,p_channel text DEFAULT 'all',p_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF p_to<=p_from OR p_to-p_from>interval '90 days' OR p_channel NOT IN ('all','direct','search_ai','social','referral','ads') THEN
   RAISE EXCEPTION 'Invalid analytics range' USING ERRCODE='22023'; END IF;
 WITH all_events AS MATERIALIZED (
   SELECT e.*,s.visitor_id,s.channel,s.source,s.medium,s.campaign,s.referrer,s.device,s.country,s.city,s.latitude,s.longitude
   FROM public.web_analytics_events e JOIN public.web_analytics_sessions s ON s.id=e.session_id
   WHERE e.created_at>=p_from AND e.created_at<p_to AND (p_path IS NULL OR e.path=p_path)
 ), filtered AS MATERIALIZED (SELECT * FROM all_events WHERE p_channel='all' OR channel=p_channel),
 visits AS MATERIALIZED (SELECT session_id,min(created_at) AS entered,count(*) AS views,min(visitor_id::text) AS visitor FROM filtered WHERE kind='pageview' GROUP BY session_id),
 seconds AS (SELECT session_id,sum(seconds) AS seconds FROM filtered WHERE kind='engagement' GROUP BY session_id),
 period_access AS MATERIALIZED (
   SELECT a.* FROM public.web_analytics_accesses a LEFT JOIN public.web_analytics_sessions s ON s.id=a.session_id
   WHERE a.created_at>=p_from AND a.created_at<p_to AND NOT a.is_platform_admin
     AND (p_channel='all' OR s.channel=p_channel) AND (p_path IS NULL OR EXISTS(SELECT 1 FROM visits v WHERE v.session_id=a.session_id))
 ), funnel_rows AS (
   SELECT v.session_id,
     EXISTS(SELECT 1 FROM filtered e WHERE e.session_id=v.session_id AND e.kind='pageview' AND e.path='/prueba-gratis') AS registration,
     EXISTS(SELECT 1 FROM filtered e WHERE e.session_id=v.session_id AND e.kind='form_start' AND e.path='/prueba-gratis') AS form_started,
     EXISTS(SELECT 1 FROM period_access a WHERE a.session_id=v.session_id AND a.kind='trial_activated') AS activated
   FROM visits v
 ), buckets AS (
   SELECT generate_series(p_from,least(p_to-interval '1 millisecond',now()),
     CASE WHEN p_to-p_from<=interval '2 days' THEN interval '1 hour' ELSE interval '1 day' END) AS at
 ), pv_buckets AS (
   SELECT date_bin(CASE WHEN p_to-p_from<=interval '2 days' THEN interval '1 hour' ELSE interval '1 day' END,created_at,p_from) at,
     count(*) pageviews,count(DISTINCT visitor_id) visitors FROM filtered WHERE kind='pageview' GROUP BY 1
 ), visit_buckets AS (
   SELECT date_bin(CASE WHEN p_to-p_from<=interval '2 days' THEN interval '1 hour' ELSE interval '1 day' END,entered,p_from) at,count(*) visits FROM visits GROUP BY 1
 ), totals AS (
   SELECT count(*) AS visits,count(DISTINCT visitor) AS visitors,
     coalesce(sum(v.views),0) AS pageviews,
     coalesce(avg(coalesce(s.seconds,0)),0) AS active_seconds,
     coalesce(100.0*count(*) FILTER(WHERE v.views=1 AND coalesce(s.seconds,0)<10)/nullif(count(*),0),0) AS bounce
   FROM visits v LEFT JOIN seconds s USING(session_id)
 )
 SELECT jsonb_build_object(
  'active',(SELECT count(*) FROM public.web_analytics_sessions WHERE last_seen>=now()-interval '5 minutes' AND (p_channel='all' OR channel=p_channel) AND (p_path IS NULL OR last_path=p_path)),
  'totals',(SELECT jsonb_build_object('visits',visits,'visitors',visitors,'pageviews',pageviews,'activeSeconds',round(active_seconds::numeric,1),'bounceRate',round(bounce,1),
    'trialActivations',(SELECT count(*) FROM period_access WHERE kind='trial_activated'),
    'conversionRate',coalesce(round(100.0*(SELECT count(*) FROM funnel_rows WHERE registration AND form_started AND activated)/nullif(visits,0),1),0)) FROM totals),
  'series',(SELECT coalesce(jsonb_agg(jsonb_build_object('at',b.at,'visits',coalesce(v.visits,0),
    'visitors',coalesce(p.visitors,0),'pageviews',coalesce(p.pageviews,0)) ORDER BY b.at),'[]'::jsonb)
    FROM buckets b LEFT JOIN pv_buckets p USING(at) LEFT JOIN visit_buckets v USING(at)),
  'channels',(SELECT coalesce(jsonb_agg(jsonb_build_object('channel',channel,'visits',n)),'[]'::jsonb) FROM (SELECT channel,count(DISTINCT session_id) n FROM all_events WHERE kind='pageview' GROUP BY channel) c),
  'sources',(SELECT coalesce(jsonb_agg(jsonb_build_object('label',label,'channel',channel,'visits',n) ORDER BY n DESC),'[]'::jsonb) FROM (SELECT coalesce(source,referrer,'Directo') label,channel,count(DISTINCT session_id) n FROM filtered WHERE kind='pageview' GROUP BY 1,2 ORDER BY n DESC LIMIT 15) s),
  'pages',(SELECT coalesce(jsonb_agg(jsonb_build_object('path',path,'views',n,'visits',visits) ORDER BY n DESC),'[]'::jsonb) FROM (SELECT path,count(*) n,count(DISTINCT session_id) visits FROM filtered WHERE kind='pageview' GROUP BY path ORDER BY n DESC LIMIT 20) p),
  'devices',(SELECT coalesce(jsonb_agg(jsonb_build_object('device',device,'visits',n) ORDER BY n DESC),'[]'::jsonb) FROM (SELECT device,count(DISTINCT session_id) n FROM filtered WHERE kind='pageview' GROUP BY device) d),
  'countries',(SELECT coalesce(jsonb_agg(jsonb_build_object('country',country,'visits',n) ORDER BY n DESC),'[]'::jsonb) FROM (SELECT coalesce(country,'XX') country,count(DISTINCT session_id) n FROM filtered WHERE kind='pageview' GROUP BY 1 ORDER BY n DESC LIMIT 30) c),
  'locations',(SELECT coalesce(jsonb_agg(jsonb_build_object('country',country,'city',city,'latitude',latitude,'longitude',longitude,'visits',n) ORDER BY n DESC),'[]'::jsonb) FROM (SELECT country,city,latitude,longitude,count(DISTINCT session_id) n FROM filtered WHERE kind='pageview' AND latitude IS NOT NULL AND longitude IS NOT NULL GROUP BY 1,2,3,4 ORDER BY n DESC LIMIT 200) l),
  'campaigns',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',source,'medium',medium,'campaign',campaign,'visits',n,'trials',trials) ORDER BY n DESC),'[]'::jsonb) FROM (
    SELECT coalesce(s.source,'Sin fuente') source,coalesce(s.medium,'Sin medio') medium,coalesce(s.campaign,'Sin campaña') campaign,count(DISTINCT v.session_id) n,
      count(DISTINCT a.organization_id) FILTER(WHERE a.kind='trial_activated') trials
    FROM visits v JOIN public.web_analytics_sessions s ON s.id=v.session_id LEFT JOIN period_access a ON a.session_id=v.session_id
    WHERE s.source IS NOT NULL OR s.campaign IS NOT NULL GROUP BY 1,2,3 ORDER BY n DESC LIMIT 20) c),
  'sessions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'visitorId',visitor_id,'userId',user_id,'startedAt',started_at,'lastSeen',last_seen,'lastPath',last_path,
    'source',coalesce(source,referrer,'Directo'),'device',device,'country',country,'city',city,'name',NULL,'email',NULL,'workshop',workshop) ORDER BY last_seen DESC),'[]'::jsonb)
    FROM (SELECT s.*,o.name workshop FROM public.web_analytics_sessions s JOIN visits v ON v.session_id=s.id
      LEFT JOIN LATERAL(SELECT org.name FROM public.organization_members m JOIN public.organizations org ON org.id=m.organization_id WHERE m.user_id=s.user_id AND m.status='active' ORDER BY m.joined_at LIMIT 1) o ON true
      ORDER BY last_seen DESC LIMIT 50) s),
  'accesses',(SELECT coalesce(jsonb_agg(jsonb_build_object('userId',a.user_id,'at',a.created_at,'kind',a.kind,'name',NULL,'email',NULL,'workshop',o.name,'device',a.device,'browser',a.browser,'country',a.country,'city',a.city) ORDER BY a.created_at DESC),'[]'::jsonb)
    FROM (SELECT a.* FROM public.web_analytics_accesses a LEFT JOIN public.web_analytics_sessions s ON s.id=a.session_id
      WHERE a.created_at>=p_from AND a.created_at<p_to AND (p_channel='all' OR s.channel=p_channel) ORDER BY a.created_at DESC LIMIT 50) a LEFT JOIN public.organizations o ON o.id=a.organization_id),
  'funnel',(SELECT jsonb_build_object('visits',count(*),'registration',count(*) FILTER(WHERE registration),'formStarted',count(*) FILTER(WHERE registration AND form_started),'activated',count(*) FILTER(WHERE registration AND form_started AND activated)) FROM funnel_rows),
  'coverage',jsonb_build_object('firstEvent',(SELECT min(started_at) FROM public.web_analytics_sessions),'located',(SELECT count(DISTINCT session_id) FROM filtered WHERE kind='pageview' AND latitude IS NOT NULL),'total',(SELECT count(*) FROM visits),'retentionDays',90)
 ) INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.web_analytics_heatmap(p_from timestamptz,p_to timestamptz,p_path text DEFAULT '/',
 p_device text DEFAULT 'all',p_layout text DEFAULT NULL,p_channel text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE chosen text; options jsonb; result jsonb;
BEGIN
 IF p_to<=p_from OR p_to-p_from>interval '90 days' OR p_device NOT IN ('all','mobile','desktop','tablet') OR p_channel NOT IN ('all','direct','search_ai','social','referral','ads') THEN
   RAISE EXCEPTION 'Invalid heatmap range' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'path',path,'variant',variant,'device',device,'viewportWidth',viewport_width,
   'viewportHeight',viewport_height,'width',width,'height',height,'sections',sections,'clicks',clicks,'visitors',visitors) ORDER BY clicks DESC,last_seen DESC),'[]'::jsonb)
 INTO options FROM (
   SELECT l.*,count(*) FILTER(WHERE e.kind='click') clicks,count(DISTINCT e.session_id) visitors
   FROM public.web_analytics_layouts l JOIN public.web_analytics_events e ON e.layout_id=l.id JOIN public.web_analytics_sessions s ON s.id=e.session_id
   WHERE l.path=p_path AND e.created_at>=p_from AND e.created_at<p_to AND (p_device='all' OR l.device=p_device) AND (p_channel='all' OR s.channel=p_channel)
   GROUP BY l.id ORDER BY clicks DESC,l.last_seen DESC LIMIT 40) l;
 chosen:=CASE WHEN p_layout IS NOT NULL THEN (SELECT value->>'id' FROM jsonb_array_elements(options) WHERE value->>'id'=p_layout) ELSE options->0->>'id' END;
 WITH events AS MATERIALIZED (
   SELECT e.* FROM public.web_analytics_events e JOIN public.web_analytics_sessions s ON s.id=e.session_id
   WHERE e.layout_id=chosen AND e.created_at>=p_from AND e.created_at<p_to AND (p_channel='all' OR s.channel=p_channel)
 ), depths AS (SELECT session_id,max(depth) depth FROM events WHERE kind='scroll' GROUP BY session_id)
 SELECT jsonb_build_object('layouts',options,'layout',(SELECT value FROM jsonb_array_elements(options) WHERE value->>'id'=chosen),
   'totalClicks',(SELECT count(*) FROM events WHERE kind='click'),
   'sampled',(SELECT count(*)>10000 FROM events WHERE kind='click'),
   'points',(SELECT coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y,'target',target)),'[]'::jsonb) FROM (SELECT x,y,target FROM events WHERE kind='click' ORDER BY created_at DESC LIMIT 10000) p),
   'targets',(SELECT coalesce(jsonb_agg(jsonb_build_object('target',target,'clicks',n) ORDER BY n DESC),'[]'::jsonb) FROM (SELECT target,count(*) n FROM events WHERE kind='click' GROUP BY target ORDER BY n DESC LIMIT 15) t),
   'scroll',(SELECT coalesce(jsonb_agg(jsonb_build_object('depth',d,'visitors',(SELECT count(*) FROM depths WHERE depth>=d)) ORDER BY d),'[]'::jsonb) FROM generate_series(0,100,5) d)
 ) INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.prune_web_analytics() RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,private AS $$
BEGIN
 DELETE FROM public.web_analytics_events WHERE created_at<now()-interval '90 days';
 DELETE FROM public.web_analytics_accesses WHERE created_at<now()-interval '90 days';
 DELETE FROM public.web_analytics_sessions WHERE last_seen<now()-interval '90 days';
 DELETE FROM public.web_analytics_layouts l WHERE last_seen<now()-interval '90 days' AND NOT EXISTS(SELECT 1 FROM public.web_analytics_events e WHERE e.layout_id=l.id);
 DELETE FROM private.web_analytics_batches WHERE created_at<now()-interval '1 day';
 DELETE FROM private.web_analytics_rates WHERE bucket<now()-interval '2 days';
END $$;

REVOKE ALL ON FUNCTION public.record_web_analytics_batch(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,uuid),
 public.record_web_analytics_access(uuid,text,uuid,uuid,uuid,boolean,jsonb),
 public.web_analytics_report(timestamptz,timestamptz,text,text),
 public.web_analytics_heatmap(timestamptz,timestamptz,text,text,text,text),public.prune_web_analytics() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_web_analytics_batch(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,uuid),
 public.record_web_analytics_access(uuid,text,uuid,uuid,uuid,boolean,jsonb),
 public.web_analytics_report(timestamptz,timestamptz,text,text),
 public.web_analytics_heatmap(timestamptz,timestamptz,text,text,text,text),public.prune_web_analytics() TO service_role;

-- Cron is optional on self-hosted stacks. A server-side opportunistic cleanup
-- also runs once per process/day; its SQL affects only these analytics tables.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
   PERFORM cron.schedule('motomanager-web-analytics-retention','17 8 * * *','SELECT public.prune_web_analytics();');
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
