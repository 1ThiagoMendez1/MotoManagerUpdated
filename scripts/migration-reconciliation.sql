-- Read-only reconciliation. Run with psql against source and a restored copy
-- BEFORE starting services/migrations on the copy. Protect both output files.
-- No identities, passwords, tokens, sessions or file contents are printed.
\set ON_ERROR_STOP on
\set QUIET on
\pset format unaligned
\pset tuples_only on
\pset fieldsep '|'
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '3s';
SET LOCAL search_path = pg_catalog;

-- Exact counts, including Auth/Storage and private quotas/analytics. No estimates.
SELECT format('SELECT %L, %L, count(*)::text FROM %I.%I',
  'rows', n.nspname || '.' || c.relname, n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','auth','storage','private','motomanager_private')
ORDER BY n.nspname,c.relname
\gexec

SELECT 'column', table_schema||'.'||table_name||'.'||column_name,
  md5(concat_ws('|',udt_schema,udt_name,is_nullable,
    coalesce(column_default,''),coalesce(character_maximum_length::text,''),
    coalesce(numeric_precision::text,''),coalesce(numeric_scale::text,'')))
FROM information_schema.columns
WHERE table_schema IN ('public','auth','storage','private','motomanager_private')
ORDER BY table_schema,table_name,column_name;

SELECT 'constraint',n.nspname||'.'||c.relname||'.'||k.conname,
  k.convalidated::text||':'||md5(pg_get_constraintdef(k.oid,true))
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','auth','storage','private','motomanager_private')
ORDER BY n.nspname,c.relname,k.conname;

SELECT 'rls',n.nspname||'.'||c.relname,
  c.relrowsecurity::text||':'||c.relforcerowsecurity::text
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','auth','storage','private','motomanager_private')
ORDER BY n.nspname,c.relname;
SELECT 'policy',schemaname||'.'||tablename||'.'||policyname,
  md5(concat_ws('|',permissive,roles::text,cmd,qual,with_check))
FROM pg_policies WHERE schemaname IN ('public','auth','storage','private','motomanager_private')
ORDER BY schemaname,tablename,policyname;
SELECT 'routine',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
  p.prosecdef::text||':'||md5(pg_get_functiondef(p.oid))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prokind IN ('f','p') AND n.nspname IN ('public','auth','storage','private','motomanager_private')
ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid);

SELECT format('SELECT %L,%L,last_value::text||%L||is_called::text FROM %I.%I',
  'sequence',n.nspname||'.'||c.relname,':',n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='S' AND n.nspname IN ('public','auth','storage','private','motomanager_private')
ORDER BY n.nspname,c.relname
\gexec

-- Counts alone cannot detect changed amounts or stocks. Preserve per-workshop
-- totals/statuses and per-item stock totals, without customer identity fields.
SELECT $$SELECT 'sales',organization_id::text||':'||coalesce(status,''),
  count(*)::text||':'||coalesce(sum(total),0)::numeric(30,2)::text
  FROM public.sales GROUP BY organization_id,status ORDER BY organization_id,status$$
WHERE to_regclass('public.sales') IS NOT NULL
\gexec
SELECT $$SELECT 'expenses',organization_id::text,
  count(*)::text||':'||coalesce(sum(amount),0)::numeric(30,2)::text
  FROM public.expenses GROUP BY organization_id ORDER BY organization_id$$
WHERE to_regclass('public.expenses') IS NOT NULL
\gexec
SELECT $$SELECT 'stock',i.organization_id::text||':'||s.item_id::text,
  count(*)::text||':'||coalesce(sum(s.quantity),0)::numeric(30,2)::text
  FROM public.inventory_item_stock s JOIN public.inventory_items i ON i.id=s.item_id
  GROUP BY i.organization_id,s.item_id ORDER BY i.organization_id,s.item_id$$
WHERE to_regclass('public.inventory_item_stock') IS NOT NULL
  AND to_regclass('public.inventory_items') IS NOT NULL
\gexec
COMMIT;
