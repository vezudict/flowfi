-- Monthly budget cap (same amount applies each calendar month; compare to current-month spend in the app).
alter table public.profiles
  add column if not exists monthly_budget numeric(14, 2);

alter table public.profiles
  drop constraint if exists profiles_monthly_budget_non_negative;

alter table public.profiles
  add constraint profiles_monthly_budget_non_negative
  check (monthly_budget is null or monthly_budget >= 0);

comment on column public.profiles.monthly_budget is 'Optional recurring monthly spending cap (currency matches transactions; compared to sum of transactions in the current calendar month).';

-- If updates fail from the app, ensure a policy allows users to update their own row, e.g.:
-- create policy "Users can update own profile"
--   on public.profiles for update
--   using (auth.uid() = id)
--   with check (auth.uid() = id);
