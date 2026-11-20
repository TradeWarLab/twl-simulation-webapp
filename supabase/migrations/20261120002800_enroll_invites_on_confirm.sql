-- Enroll invited students when their email is confirmed.
--
-- Bug: an instructor invites an email that has no account. The student signs
-- up, but the sign-up form sends no class_code, so handle_new_user does not
-- read the pending invite. The student gets no class and no team.
--
-- Fix: when auth.users.email_confirmed_at becomes set, enroll the user in
-- each class with a pending invite for that email, on the invited team.
-- With email confirmation off, Auth sets email_confirmed_at at insert, so
-- the student is enrolled at sign-up. With it on, enrollment waits for the
-- confirmation link. The match uses auth.users.email, which the user cannot
-- set to an address they do not control (not public.users.email, Audit S4).


-- ──────────────────────────────────────────────
-- enroll_from_invites: trigger function on auth.users
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enroll_from_invites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_invite record;
begin
  -- One invite per class. The unique key is case-sensitive, so two rows can
  -- match lower(email). Use the newest.
  for v_invite in
    select distinct on (ci.class_id) ci.class_id, ci.affiliation, ci.interest_block
    from public.class_invites ci
    where lower(ci.email) = lower(new.email)
      and ci.status = 'pending'
    order by ci.class_id, ci.invited_at desc
  loop
    insert into public.students_classes (student_id, class_id, team_id, interest_block)
    values (
      new.id,
      v_invite.class_id,
      (select t.id from public.teams t
        where t.class_id = v_invite.class_id and t.country = v_invite.affiliation
        limit 1),
      v_invite.interest_block
    )
    on conflict (student_id, class_id) do nothing;

    update public.class_invites
    set status = 'account_created'
    where class_id = v_invite.class_id and lower(email) = lower(new.email);
  end loop;

  return null;
end;
$function$
;

revoke execute on function public.enroll_from_invites() from public, anon, authenticated;


-- ──────────────────────────────────────────────
-- Triggers
-- ──────────────────────────────────────────────
-- Postgres fires triggers of one event in name order. These names sort after
-- on_auth_user_created, so the public.users row exists before the insert into
-- students_classes (foreign key).

CREATE TRIGGER on_auth_user_enroll_invites_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (new.email_confirmed_at is not null)
  EXECUTE FUNCTION public.enroll_from_invites();

CREATE TRIGGER on_auth_user_enroll_invites_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  EXECUTE FUNCTION public.enroll_from_invites();
