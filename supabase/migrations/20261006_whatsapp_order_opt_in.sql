alter table public.orders
  add column if not exists whatsapp_opt_in boolean not null default false;