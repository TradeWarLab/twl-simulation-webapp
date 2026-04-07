create or replace function public.enroll_student(p_class_code text)
returns void as $$
declare
  v_class_id uuid;
  v_user_email text;
  v_student_id uuid;
  v_target_team_id uuid;
  v_target_country text;
  v_target_interest text;
begin
  v_student_id := auth.uid();
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_class_id from public.classes 
  where upper(class_code) = upper(trim(p_class_code));

  if v_class_id is null then
    raise exception 'Invalid class code';
  end if;

  -- Verify user isn't already enrolled
  if exists (select 1 from public.students_classes where student_id = v_student_id and class_id = v_class_id) then
    raise exception 'You are already enrolled in this class';
  end if;

  select email into v_user_email from public.users where id = v_student_id;

  -- See if there was a previous invite to get their pre-assigned affiliation and interest block
  select affiliation, interest_block 
  into v_target_country, v_target_interest
  from public.class_invites 
  where class_id = v_class_id and lower(email) = lower(v_user_email)
  order by invited_at desc 
  limit 1;

  -- Find the team ID corresponding to the target country (if any)
  if v_target_country is not null then
    select id into v_target_team_id from public.teams 
    where class_id = v_class_id and country = v_target_country
    limit 1;
  end if;

  insert into public.students_classes (student_id, class_id, team_id, interest_block)
  values (v_student_id, v_class_id, v_target_team_id, v_target_interest);

  update public.class_invites 
  set status = 'account_created' 
  where class_id = v_class_id and lower(email) = lower(v_user_email);

end;
$$ language plpgsql security definer;
