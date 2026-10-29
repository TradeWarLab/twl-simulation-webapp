-- ──────────────────────────────────────────────
-- No-deal cost randomization.
--
-- Each class gets one cost-of-failure combination (USA/PRC) when it first
-- enters Round 1. Combinations are dealt in shuffled blocks of four, so all
-- four are used once before any repeats (permuted-block randomization).
--
-- Instructors cannot set or change a cost: no write policy exists, and only
-- the trigger below writes. A student can read only their own team's cost,
-- through get_no_deal_costs. The other team's cost stays hidden, also after
-- the round ends.
--
-- Idempotent: safe to re-run.
-- ──────────────────────────────────────────────

begin;

-- One row per dealt combination. class_id is null until a class takes it.
create table if not exists public.no_deal_cost_slots (
  id bigint generated always as identity primary key,
  usa_cost int not null check (usa_cost <= 0),
  china_cost int not null check (china_cost <= 0),
  class_id uuid unique references public.classes on delete set null,
  assigned_at timestamptz
);

alter table public.no_deal_cost_slots enable row level security;

drop policy if exists "Instructors can view their classes' no-deal costs."
  on public.no_deal_cost_slots;
create policy "Instructors can view their classes' no-deal costs."
  on public.no_deal_cost_slots for select using (
    exists (
      select 1 from public.classes
      where id = no_deal_cost_slots.class_id and instructor_id = auth.uid()
    )
  );

-- Gives the class a combination if it has none. A class keeps its first
-- combination, so a rewind and restart cannot reroll it.
create or replace function public.assign_no_deal_cost(p_class_id uuid)
returns void as $$
declare
  v_slot bigint;
begin
  -- Serializes assignment, so two classes that start at the same time cannot
  -- take the same slot or both open a new block.
  perform pg_advisory_xact_lock(hashtext('no_deal_cost_slots'));

  if exists (select 1 from public.no_deal_cost_slots where class_id = p_class_id) then
    return;
  end if;

  select id into v_slot from public.no_deal_cost_slots
   where class_id is null order by id limit 1;

  if v_slot is null then
    -- The four combinations, USA cost first. Edit here to change them; a
    -- block already dealt keeps its old values.
    insert into public.no_deal_cost_slots (usa_cost, china_cost)
    select usa_cost, china_cost
      from (values (-10, -10), (0, 0), (0, -10), (-10, -20)) as c(usa_cost, china_cost)
     order by random();

    select id into v_slot from public.no_deal_cost_slots
     where class_id is null order by id limit 1;
  end if;

  update public.no_deal_cost_slots
     set class_id = p_class_id, assigned_at = now()
   where id = v_slot;
end;
$$ language plpgsql security definer;

-- Internal only. A client that calls it could use up slots and skew the cycle.
revoke execute on function public.assign_no_deal_cost(uuid) from public, anon, authenticated;

create or replace function public.assign_no_deal_cost_on_round_one()
returns trigger as $$
begin
  perform public.assign_no_deal_cost(new.id);
  return new;
end;
$$ language plpgsql security definer;

revoke execute on function public.assign_no_deal_cost_on_round_one() from public, anon, authenticated;

-- Fires only when a class leaves Setup. `>= 1`, not `= 1`: updateClassPeriod
-- lets an instructor skip a period. Requiring Setup as the old period keeps a
-- class that was already past Setup before this migration on the old -10,
-- instead of giving it a new cost in the middle of a run.
drop trigger if exists on_class_round_one on public.classes;
create trigger on_class_round_one
  after update of current_period on public.classes
  for each row
  when (coalesce(old.current_period, 0) = 0 and new.current_period >= 1)
  execute procedure public.assign_no_deal_cost_on_round_one();

-- The no-deal costs the caller may see: both for the class instructor, only
-- their own team's for a student, none for anyone else. A class from before
-- this migration has no slot and reads as the old fixed -10.
create or replace function public.get_no_deal_costs(p_class_id uuid)
returns table (country text, cost int) as $$
  select t.country,
         case t.country when 'USA' then coalesce(s.usa_cost, -10)
                        else coalesce(s.china_cost, -10) end
    from public.teams t
    left join public.no_deal_cost_slots s on s.class_id = t.class_id
   where t.class_id = p_class_id
     and (
       exists (
         select 1 from public.classes c
         where c.id = p_class_id and c.instructor_id = auth.uid()
       )
       or exists (
         select 1 from public.students_classes sc
         where sc.class_id = p_class_id and sc.student_id = auth.uid()
           and sc.team_id = t.id
       )
     );
$$ language sql stable security definer;

grant execute on function public.get_no_deal_costs(uuid) to authenticated;

commit;
