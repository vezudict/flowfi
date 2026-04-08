-- debit = expense/outflow, credit = income/inflow
alter table public.transactions
  add column if not exists transaction_type text;

update public.transactions
set transaction_type = coalesce(nullif(trim(transaction_type), ''), 'debit');

update public.transactions
set transaction_type = 'credit'
where lower(trim(category)) in (
    'income',
    'salary',
    'payroll',
    'wages',
    'paycheck',
    'bonus',
    'interest',
    'dividend',
    'refund',
    'reimbursement'
  );

update public.transactions
set transaction_type = 'debit'
where transaction_type is null;

alter table public.transactions
  alter column transaction_type set default 'debit';

alter table public.transactions
  alter column transaction_type set not null;

alter table public.transactions drop constraint if exists transactions_transaction_type_check;

alter table public.transactions
  add constraint transactions_transaction_type_check check (transaction_type in ('debit', 'credit'));

comment on column public.transactions.transaction_type is 'debit = expense, credit = income';
