-- ROYAL ENTERPRISE — database schema (run once in Supabase -> SQL Editor)
-- Includes every table needed by Phase 1 AND Phase 2, so no migration is needed later.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create sequence if not exists order_number_seq start 10001;

-- ---------- catalogue ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  section text not null default 'electronics' check (section in ('mobiles','electronics')),
  icon text,                       -- icon key used by the UI (phone, headset, plug, tv, fridge, washer, watch, speaker)
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sub_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (category_id, slug)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references sub_categories(id) on delete set null,
  brand text,
  description text,
  price numeric(12,2) not null check (price >= 0),
  original_price numeric(12,2),
  discount int not null default 0,          -- % ; if 0 the UI derives it from original_price
  stock int not null default 0,
  sku text unique,
  thumbnail_url text,                       -- external URL (no Supabase Storage)
  image_urls jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,  -- ["6.7\" AMOLED", "5000 mAh", ...]
  badge text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on products(category_id);
drop trigger if exists products_updated on products;
create trigger products_updated before update on products for each row execute function set_updated_at();

create table if not exists product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  spec_key text not null,
  spec_value text not null,
  sort_order int not null default 0
);
create index if not exists specs_product_idx on product_specifications(product_id);

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  review text,
  review_date date not null default current_date,
  is_visible boolean not null default true
);
create index if not exists reviews_product_idx on product_reviews(product_id);

create table if not exists product_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  title text not null,
  description text,
  discount_text text,
  image_url text,
  sort_order int not null default 0
);
create index if not exists offers_product_idx on product_offers(product_id);

create table if not exists product_warranties (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  title text not null,
  duration text,
  description text
);
create index if not exists warranties_product_idx on product_warranties(product_id);

-- Product detail tabs are configurable. Built-in keys: specifications, reviews, offers, warranty.
-- Any other key is a custom tab that shows `content`.
create table if not exists product_tabs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  content text,
  is_enabled boolean not null default true,
  is_custom boolean not null default false,
  sort_order int not null default 0
);

-- ---------- customers & orders ----------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null unique,
  whatsapp text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default ('RE-' || nextval('order_number_seq')),
  access_token text not null,               -- secret handed to the buyer for the confirmation page
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  mobile text not null,
  whatsapp text,
  email text,
  address text not null,
  area text,
  city text,
  pincode text,
  note text,
  subtotal numeric(12,2) not null,
  delivery_charge numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  order_status text not null default 'ORDER_PLACED' check (order_status in
    ('ORDER_PLACED','CONFIRMED','PROCESSING','OUT_FOR_DELIVERY','DELIVERED','CUSTOMER_CANCELLED','CANCELLED','OUT_OF_STOCK')),
  payment_status text not null default 'PAYMENT_PENDING' check (payment_status in
    ('PAYMENT_PENDING','PAYMENT_RECEIVED','REFUNDED')),
  whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table orders add column if not exists whatsapp_opt_in boolean not null default false;
create index if not exists orders_mobile_idx on orders(mobile);
create index if not exists orders_created_idx on orders(created_at desc);
drop trigger if exists orders_updated on orders;
create trigger orders_updated before update on orders for each row execute function set_updated_at();

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,               -- snapshot, survives product edits/deletes
  thumbnail_url text,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on order_items(order_id);

-- ---------- settings & templates ----------
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists admin_message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  body text not null,
  sort_order int not null default 0
);

-- ---------- security ----------
-- RLS is ON with NO policies: the browser (anon key) can read/write nothing.
-- Only the Express server, using the service-role key, touches the database.
alter table categories enable row level security;
alter table sub_categories enable row level security;
alter table products enable row level security;
alter table product_specifications enable row level security;
alter table product_reviews enable row level security;
alter table product_offers enable row level security;
alter table product_warranties enable row level security;
alter table product_tabs enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table settings enable row level security;
alter table admin_message_templates enable row level security;
