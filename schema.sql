-- Create a table for public profiles linked to auth.users
create table public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  email text,
  role text check (role in ('instructor', 'student')) default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies for users
create policy "Public profiles are viewable by everyone." on public.users
  for select using (true);

create policy "Users can insert their own profile." on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.users
  for update using (auth.uid() = id);

-- Create classes table
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  instructor_id uuid references public.users not null,
  name text not null,
  status text check (status in ('active', 'archived')) default 'active',
  current_period int default 0, -- 0=Setup, 1=Watch, 2=Debate, 3=Negotiation, 4=Reflection
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for classes
alter table public.classes enable row level security;

-- Classes policies
create policy "Classes are viewable by everyone." on public.classes
  for select using (true); -- Or restrict to enrolled students/instructors

create policy "Instructors can create classes." on public.classes
  for insert with check (auth.uid() = instructor_id);

create policy "Instructors can update their own classes." on public.classes
  for update using (auth.uid() = instructor_id);

-- Create teams table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  country text check (country in ('USA', 'China')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(class_id, country)
);

alter table public.teams enable row level security;

create policy "Teams are viewable by everyone in the class." on public.teams
  for select using (true); -- refine later

-- Create students_classes (enrollment) table
create table public.students_classes (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.users not null,
  class_id uuid references public.classes not null,
  team_id uuid references public.teams,
  interest_block text, -- 'Economy', 'Security', etc.
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, class_id)
);

alter table public.students_classes enable row level security;

create policy "Enrollments are viewable by everyone in the class." on public.students_classes
  for select using (true);

create policy "Instructors can manage enrollments." on public.students_classes
  for all using (
    exists (
      select 1 from public.classes
      where id = students_classes.class_id and instructor_id = auth.uid()
    )
  );

-- Create briefings table
create table public.briefings (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  title text not null,
  content text, -- Can be a URL or markdown text
  target_role text check (target_role in ('USA', 'China', 'All')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.briefings enable row level security;

create policy "Briefings are viewable by target audience." on public.briefings
  for select using (
    -- Logic to check if user is in the target team or is instructor
    true -- simplifying for initial setup
  );

create policy "Instructors can manage briefings." on public.briefings
  for all using (
    exists (
      select 1 from public.classes
      where id = briefings.class_id and instructor_id = auth.uid()
    )
  );

-- Create messages table (for chat)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  sender_id uuid references public.users not null,
  channel text not null, -- 'global', 'team_usa', 'team_china', 'negotiation'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

create policy "Messages are viewable by channel members." on public.messages
  for select using (true); -- simplify for now

create policy "Users can insert messages." on public.messages
  for insert with check (auth.uid() = sender_id);

-- Create negotiation_actions table
create table public.negotiation_actions (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes not null,
  team_id uuid references public.teams not null, -- Who proposed it
  type text check (type in ('ask', 'concession', 'official_request')) not null,
  status text check (status in ('pending', 'accepted', 'declined', 'draft')) default 'draft',
  details jsonb, -- Flexible structure for the content of the ask/concession
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.negotiation_actions enable row level security;

create policy "Negotiation actions viewable by class." on public.negotiation_actions
  for select using (true);

create policy "Teams can manage their own drafts." on public.negotiation_actions
  for all using (
    exists (
        select 1 from public.students_classes
        where student_id = auth.uid() and team_id = negotiation_actions.team_id
    )
  );

-- Create negotiation_bundles table (for bundling requests)
create table public.negotiation_bundles (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes not null,
    proposing_team_id uuid references public.teams not null,
    status text check (status in ('proposed', 'accepted', 'declined')) default 'proposed',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.negotiation_bundles enable row level security;

-- Add bundle_id to negotiation_actions to link them
alter table public.negotiation_actions add column bundle_id uuid references public.negotiation_bundles;

-- Function to handle new user signup (trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'student'), new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
