-- Repair script for test Supabase projects where class creation makes teams
-- but does not pre-populate trade_items.
--
-- Run this against the TEST Supabase project only.
-- It is idempotent: it only inserts missing global_issues, teams, and trade_items.

begin;

with issue_titles(title) as (
	values
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
		('China to eliminate specific policies and practices linked to forced technology transfer.')
)
insert into public.global_issues (title)
select issue_titles.title
from issue_titles
where not exists (
	select 1
	from public.global_issues
	where public.global_issues.title = issue_titles.title
);

insert into public.teams (class_id, country)
select classes.id, country.country
from public.classes
cross join (values ('USA'), ('China')) as country(country)
where not exists (
	select 1
	from public.teams
	where teams.class_id = classes.id
		and teams.country = country.country
);

insert into public.trade_items (
	class_id,
	team_id,
	issue_id,
	name,
	value,
	role,
	is_resolved
)
select
	teams.class_id,
	teams.id,
	global_issues.id,
	global_issues.title,
	0,
	case
		when global_issues.title like 'The U.S.%' and teams.country = 'China' then 'ask'
		when global_issues.title like 'The U.S.%' and teams.country = 'USA' then 'concession'
		when global_issues.title like 'China%' and teams.country = 'USA' then 'ask'
		when global_issues.title like 'China%' and teams.country = 'China' then 'concession'
		else null
	end,
	false
from public.teams
cross join public.global_issues
where teams.country in ('USA', 'China')
	and not exists (
		select 1
		from public.trade_items
		where trade_items.class_id = teams.class_id
			and trade_items.team_id = teams.id
			and trade_items.name = global_issues.title
	);

commit;

-- Optional sanity checks after running:
-- select count(*) as global_issue_count from public.global_issues;
-- select classes.name, teams.country, count(trade_items.id) as trade_item_count
-- from public.classes
-- join public.teams on teams.class_id = classes.id
-- left join public.trade_items on trade_items.class_id = classes.id
-- 	and trade_items.team_id = teams.id
-- group by classes.name, teams.country
-- order by classes.name, teams.country;
