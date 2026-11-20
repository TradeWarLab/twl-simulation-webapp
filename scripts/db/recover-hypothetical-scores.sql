-- Read-only. For each class that reached Round 2, score the LAST package that
-- went to a vote, as if every member had approved. Same rule as
-- finalize_ratified_package: a team scores the sum of its own values over the
-- package items (both mirror rows, matched by issue_id, else by name).
-- A class with no package row never called a vote. Its board was deleted when
-- the round ended, so it cannot be recovered.
--
-- Run (prod, under the lab login):
--   npx supabase@latest db query --remote=<prod-ref> --read-only -f scripts/db/recover-hypothetical-scores.sql -o csv > scores.csv

with last_pkg as (
  select distinct on (p.class_id) p.*
  from public.trade_proposals p
  where p.is_package
  order by p.class_id, p.created_at desc
),
pkg_items as (
  select lp.id as proposal_id, lp.class_id, (e->>'item_id')::uuid as item_id
  from last_pkg lp
  cross join lateral jsonb_array_elements(
    coalesce(lp.offered_items, '[]'::jsonb) || coalesce(lp.requested_items, '[]'::jsonb)
  ) as e
  where e->>'item_id' is not null
),
resolved as (
  select distinct pi.proposal_id, ti.id, ti.team_id, ti.value
  from pkg_items pi
  join public.trade_items src on src.id = pi.item_id
  join public.trade_items ti
    on ti.class_id = pi.class_id
   and (ti.issue_id = src.issue_id or (src.issue_id is null and ti.name = src.name))
),
votes as (
  select proposal_id,
         count(*) filter (where vote = 'approve') as approvals,
         count(*) filter (where vote = 'reject') as rejections
  from public.votes
  group by proposal_id
)
select c.name as class_name,
       c.id as class_id,
       c.created_at::date as class_date,
       c.status as class_status,
       t.country as team,
       (select count(*) from public.students_classes sc where sc.team_id = t.id) as team_members,
       lp.status as last_package_status,
       lp.created_at as last_package_at,
       v.approvals,
       v.rejections,
       case when lp.id is null then null else coalesce(sum(r.value), 0) end as package_score,
       ts.score as saved_score,
       case t.country when 'USA' then nd.usa_cost when 'China' then nd.china_cost end as no_deal_cost
from public.classes c
join public.teams t on t.class_id = c.id
left join last_pkg lp on lp.class_id = c.id
left join resolved r on r.proposal_id = lp.id and r.team_id = t.id
left join votes v on v.proposal_id = lp.id
left join public.team_scores ts on ts.class_id = c.id and ts.team_id = t.id
left join public.no_deal_cost_slots nd on nd.class_id = c.id
where c.current_period >= 2
group by c.name, c.id, c.created_at, c.status, t.id, t.country,
         lp.id, lp.status, lp.created_at, v.approvals, v.rejections, ts.score,
         nd.usa_cost, nd.china_cost
order by c.created_at, c.name, t.country;
