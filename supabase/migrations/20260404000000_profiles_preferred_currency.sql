-- User-facing currency for Intl formatting across the app.
alter table public.profiles
  add column if not exists preferred_currency text not null default 'USD';

alter table public.profiles
  drop constraint if exists profiles_preferred_currency_valid;

alter table public.profiles
  add constraint profiles_preferred_currency_valid
  check (preferred_currency in ('INR', 'USD', 'GBP', 'EUR', 'JPY', 'CNY'));

comment on column public.profiles.preferred_currency is 'ISO 4217 code used by formatCurrency in the UI (INR, USD, GBP, EUR, JPY, CNY).';
