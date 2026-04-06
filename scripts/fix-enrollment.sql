-- 1. Update the new user trigger to ensure uppercase/trim on class code, and update invite status
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_class_id uuid;
begin
  insert into public.users (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'student'), new.email);
  
  if new.raw_user_meta_data->>'class_code' is not null then
    select id into v_class_id from public.classes where upper(class_code) = upper(trim(new.raw_user_meta_data->>'class_code'));
    if v_class_id is not null then
      insert into public.students_classes (student_id, class_id)
      values (new.id, v_class_id)
      on conflict do nothing;

      -- Update any pending invite
      update public.class_invites 
      set status = 'account_created' 
      where class_id = v_class_id and lower(email) = lower(new.email);
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the enroll_student RPC function for secure POST-signup enrollment
create or replace function public.enroll_student(p_class_code text)
returns void as $$
declare
  v_class_id uuid;
  v_user_email text;
  v_student_id uuid;
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

  insert into public.students_classes (student_id, class_id)
  values (v_student_id, v_class_id);

  update public.class_invites 
  set status = 'account_created' 
  where class_id = v_class_id and lower(email) = lower(v_user_email);

end;
$$ language plpgsql security definer;
