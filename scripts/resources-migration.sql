-- Add notebooklm_url to classes
alter table public.classes
add column notebooklm_url text;

-- Create global_issues table
create table public.global_issues (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_at timestamptz default now() not null
);

-- Insert 24 default PRC vs USA issues
insert into public.global_issues (title) values 
  ('The U.S. to lift bans on high technology exports such as integrated circuits and aircraft to China.'),
  ('The U.S. to agree to a more limited approach in defining its export control regime and remove Chinese companies like Huawei from the entities list.'),
  ('The U.S. to give equal treatment to Chinese companies in national security review (CFIUS).'),
  ('The U.S. to reduce tariffs on Chinese imports to 2017 levels.'),
  ('The U.S. to open government procurement to Chinese technology products and services.'),
  ('The U.S. to refrain from restricting visas for Chinese students and professionals.'),
  ('The U.S. to recognize core Chinese national interests: keeping national unity of mainland China and Tibet, Xinjiang, Hong Kong, and Taiwan.'),
  ('The U.S. to recognize core Chinese national interests: sovereignty over South China Sea.'),
  ('The U.S. to agree not to send warships or military personnel to Taiwan.'),
  ('China to remove or reduce investment restrictions identified by the U.S.'),
  ('China to strengthen intellectual property protection.'),
  ('China to increase import of American energy products by $10-20 billion.'),
  ('China to cease subsidies and other forms of assistance that support industries targeted in the MiC 2025 plan and other emerging and strategic industries.'),
  ('China to commit to reduction of the trade deficit between China and the U.S.by $100-200 billion by 2020.'),
  ('China to remove specified non-tariff barriers and recognize that the U.S. may impose import restrictions and tariffs on products in critical sectors.'),
  ('China to help identify and discourage Chinese firms that evade U.S. sanctions against Iran/North Korea.'),
  ('China to guarantee human rights and democracy in Hong Kong'),
  ('China to issue an improved nationwide negative list for foreign investment (especially take measures to liberalize the financial sector).'),
  ('China to increase import of American agricultural products by $20-30 billion.'),
  ('China to cease government-sponsored or tolerated cyber espionage and intrusions into U.S. commercial networks.'),
  ('China to establish a high-level dialogue with the U.S. to discuss dual-use technologies.'),
  ('China to refrain from military development of man-made islands in the South China Sea.'),
  ('China to eliminate laws and regulations, such as licensing or procurement, that treat foreign entities less favorably than domestic Chinese firms.'),
  ('China to eliminate specific policies and practices linked to forced technology transfer.');

-- Modify trade_items to act as team_issue_values
alter table public.trade_items
add column issue_id uuid references public.global_issues,
add column role text check (role in ('ask', 'concession')),
add column is_resolved boolean default false not null;

-- Ensure that old rows or new logic won't break if issue_id is temporarily null,
-- but the long-term plan is that name is mirroring the issue title, and issue_id is the canonical link.

-- Drop the old constraint to allow the name to be nullable if we only want to rely on issue_id, 
-- or keep name mirroring for backward UI compatibility. We will keep name for now.
