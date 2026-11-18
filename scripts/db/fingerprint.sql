-- Schema fingerprint of the public schema. Read-only. One SELECT.
-- Returns one row per object: kind, name, def.
-- Excludes volatile data: OIDs, row counts, grantors, statistics.
-- Used by scripts/db/check-drift.mjs.
with
rels as (
  select c.oid, c.relname, c.relkind, c.relowner, c.relacl,
         c.relrowsecurity, c.relforcerowsecurity, c.relreplident
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
),
items(kind, name, def) as (
  -- Tables, views, sequences: kind, owner, RLS, replica identity.
  select 'table', 'public.' || r.relname,
         'relkind=' || r.relkind::text
         || ' owner=' || pg_get_userbyid(r.relowner)
         || ' rls=' || r.relrowsecurity
         || ' force_rls=' || r.relforcerowsecurity
         || ' replica_identity=' || case r.relreplident
              when 'd' then 'default' when 'f' then 'full'
              when 'n' then 'nothing' when 'i' then 'index' end
  from rels r

  union all
  -- Columns: position among live columns, type, nullability, default.
  select 'column', 'public.' || r.relname || '.' || a.attname,
         '#' || row_number() over (partition by r.oid order by a.attnum)
         || ' ' || format_type(a.atttypid, a.atttypmod)
         || case when a.attnotnull then ' not null' else '' end
         || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
         || case a.attidentity when 'a' then ' identity always'
              when 'd' then ' identity by default' else '' end
         || case when a.attgenerated <> '' then ' generated' else '' end
  from rels r
  join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where r.relkind <> 'S'

  union all
  -- Constraints: primary key, unique, check, foreign key, exclusion.
  select 'constraint', 'public.' || r.relname || '.' || con.conname,
         pg_get_constraintdef(con.oid)
  from pg_constraint con
  join rels r on r.oid = con.conrelid

  union all
  -- Indexes, including the ones behind constraints.
  select 'index', 'public.' || i.tablename || '.' || i.indexname, i.indexdef
  from pg_indexes i
  where i.schemaname = 'public'

  union all
  -- RLS policies.
  select 'policy', 'public.' || p.tablename || ' "' || p.policyname || '"',
         p.cmd || ' ' || p.permissive
         || ' to ' || (select string_agg(x, ',' order by x collate "C") from unnest(p.roles) x)
         || ' using ' || coalesce(p.qual, '-')
         || ' check ' || coalesce(p.with_check, '-')
  from pg_policies p
  where p.schemaname = 'public'

  union all
  -- Functions: owner, EXECUTE grants (null ACL shown as the default), full definition.
  -- CR characters are removed: some bodies were saved with CRLF line endings.
  select 'function', 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         'owner=' || pg_get_userbyid(p.proowner)
         || ' execute=' || coalesce((
              select string_agg(g, ',' order by g collate "C")
              from (
                select case when e.grantee = 0 then 'PUBLIC' else pg_get_userbyid(e.grantee) end g
                from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e
                where e.privilege_type = 'EXECUTE'
              ) s), '-')
         || chr(10) || replace(pg_get_functiondef(p.oid), chr(13), '')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'

  union all
  -- Triggers on public tables, and triggers anywhere (for example auth.users)
  -- that call a public function.
  select 'trigger', tn.nspname || '.' || tc.relname || '.' || t.tgname,
         pg_get_triggerdef(t.oid) || ' enabled=' || t.tgenabled::text
  from pg_trigger t
  join pg_class tc on tc.oid = t.tgrelid
  join pg_namespace tn on tn.oid = tc.relnamespace
  join pg_proc fp on fp.oid = t.tgfoid
  join pg_namespace fn on fn.oid = fp.pronamespace
  where not t.tgisinternal and (tn.nspname = 'public' or fn.nspname = 'public')

  union all
  -- Publication membership (realtime).
  select 'publication', pt.pubname || ' public.' || pt.tablename,
         'columns=' || array_to_string(pt.attnames, ',')
         || ' rowfilter=' || coalesce(pt.rowfilter, '-')
  from pg_publication_tables pt
  where pt.schemaname = 'public'

  union all
  -- Table and sequence grants, per grantee. A trailing * marks WITH GRANT OPTION.
  select 'grant', 'public.' || r.relname || ' to ' || g.grantee, g.privs
  from rels r
  cross join lateral (
    select case when e.grantee = 0 then 'PUBLIC' else pg_get_userbyid(e.grantee) end grantee,
           string_agg(e.privilege_type || case when e.is_grantable then '*' else '' end,
                      ',' order by e.privilege_type) privs
    from aclexplode(coalesce(r.relacl,
           acldefault((case when r.relkind = 'S' then 's' else 'r' end)::"char", r.relowner))) e
    group by 1
  ) g

  union all
  -- Column-level grants.
  select 'grant', 'public.' || r.relname || '.' || a.attname || ' to ' || g.grantee, g.privs
  from rels r
  join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
  cross join lateral (
    select case when e.grantee = 0 then 'PUBLIC' else pg_get_userbyid(e.grantee) end grantee,
           string_agg(e.privilege_type || case when e.is_grantable then '*' else '' end,
                      ',' order by e.privilege_type) privs
    from aclexplode(a.attacl) e
    group by 1
  ) g
  where a.attacl is not null

  union all
  -- Schema grants.
  select 'grant', 'schema public to ' || g.grantee, g.privs
  from pg_namespace n
  cross join lateral (
    select case when e.grantee = 0 then 'PUBLIC' else pg_get_userbyid(e.grantee) end grantee,
           string_agg(e.privilege_type || case when e.is_grantable then '*' else '' end,
                      ',' order by e.privilege_type) privs
    from aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) e
    group by 1
  ) g
  where n.nspname = 'public'

  union all
  -- Default privileges for new objects that postgres creates in schema public.
  -- Only postgres: migrations run as postgres, and they cannot change the
  -- defaults of platform roles such as supabase_admin.
  select 'default_acl',
         'for ' || pg_get_userbyid(d.defaclrole)
         || ' on ' || case d.defaclobjtype when 'r' then 'tables' when 'S' then 'sequences'
              when 'f' then 'functions' when 'T' then 'types' when 'n' then 'schemas' end
         || ' to ' || g.grantee,
         g.privs
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral (
    select case when e.grantee = 0 then 'PUBLIC' else pg_get_userbyid(e.grantee) end grantee,
           string_agg(e.privilege_type || case when e.is_grantable then '*' else '' end,
                      ',' order by e.privilege_type) privs
    from aclexplode(d.defaclacl) e
    group by 1
  ) g
  where n.nspname = 'public' and pg_get_userbyid(d.defaclrole) = 'postgres'

  union all
  -- Enums, domains and standalone composite types.
  select 'type', 'public.' || t.typname,
         case t.typtype
           when 'e' then 'enum ' || (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
                                     from pg_enum e where e.enumtypid = t.oid)
           when 'd' then 'domain ' || format_type(t.typbasetype, t.typtypmod)
           else 'composite' end
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  left join pg_class c on c.oid = t.typrelid
  where n.nspname = 'public'
    and (t.typtype in ('e', 'd') or (t.typtype = 'c' and c.relkind = 'c'))

  union all
  -- Reference data the app needs: the global_issues seed rows (not ids or timestamps).
  select 'seed', 'public.global_issues: ' || gi.title,
         'description=' || coalesce(gi.description, '-')
  from public.global_issues gi
)
select kind, name, def
from items
order by kind collate "C", name collate "C", def collate "C";
