-- Read-only inventory for a staging copy or an authorized production connection.
\set ON_ERROR_STOP on
SELECT version();
SELECT extname, extversion FROM pg_extension ORDER BY extname;
SELECT schemaname, tablename, rowsecurity FROM pg_tables
 WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;
SELECT schemaname, relname, n_live_tup AS estimated_rows, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
 FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;
SELECT n.nspname AS schema, p.proname, p.prosecdef AS security_definer,
 pg_get_function_identity_arguments(p.oid) AS arguments
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','auth','storage') ORDER BY 1,2;
SELECT schemaname, tablename, policyname, roles, cmd FROM pg_policies ORDER BY 1,2,3;
SELECT pubname, schemaname, tablename FROM pg_publication_tables ORDER BY 1,2,3;
-- Reports metadata only. Never select auth.users, sessions, tokens, or object contents here.
