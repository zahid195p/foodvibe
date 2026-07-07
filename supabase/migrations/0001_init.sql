-- FoodVibe — initial schema (Phase 0)
-- Roles, restaurants, menus, orders, audit trail + Row-Level Security.
-- Apply in the Supabase SQL editor, or with `supabase db push`.

-- ═══ Enums ═══════════════════════════════════════════════════════════

create type public.user_role as enum ('buyer', 'restaurant', 'rider', 'admin');

create type public.order_status as enum (
  'placed',           -- buyer submitted
  'accepted',         -- restaurant confirmed, prep time set
  'preparing',
  'ready',            -- waiting for a rider
  'rider_assigned',
  'picked_up',
  'delivered',
  'rejected',         -- restaurant declined
  'cancelled',        -- buyer or admin cancelled
  'refund_requested'
);

-- ═══ Profiles ════════════════════════════════════════════════════════
-- One row per auth user. `role` decides which interface they see.
-- Role changes are admin-only (via dashboard/service key for now).

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null default 'buyer',
  full_name  text not null default '',
  phone      text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role lookup used by policies. SECURITY DEFINER so it can read profiles
-- without tripping RLS recursion.
create function public.my_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ═══ Restaurants ═════════════════════════════════════════════════════

create table public.restaurants (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id),
  name             text not null,
  description      text not null default '',
  address          text not null default '',
  lat              double precision,
  lng              double precision,
  is_approved      boolean not null default false,  -- admin flips after KYC
  is_open          boolean not null default false,
  min_order_rs     integer not null default 0,
  packaging_fee_rs integer not null default 0,
  created_at       timestamptz not null default now()
);

create index restaurants_owner_idx on public.restaurants (owner_id);

-- ═══ Menu ════════════════════════════════════════════════════════════

create table public.menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0
);

create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id   uuid references public.menu_categories (id) on delete set null,
  name          text not null,
  description   text not null default '',
  price_rs      integer not null check (price_rs >= 0),
  image_url     text,
  is_available  boolean not null default true,
  sort_order    integer not null default 0
);

create index menu_categories_restaurant_idx on public.menu_categories (restaurant_id);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id);

-- ═══ Orders ══════════════════════════════════════════════════════════

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  buyer_id         uuid not null references public.profiles (id),
  restaurant_id    uuid not null references public.restaurants (id),
  rider_id         uuid references public.profiles (id),
  status           public.order_status not null default 'placed',
  subtotal_rs      integer not null check (subtotal_rs >= 0),
  delivery_fee_rs  integer not null default 0,
  packaging_fee_rs integer not null default 0,
  total_rs         integer not null check (total_rs >= 0),
  payment_method   text not null default 'cod',
  delivery_address text not null,
  delivery_lat     double precision,
  delivery_lng     double precision,
  note             text not null default '',
  -- Buyer shows this to the rider at handover; rider enters it to complete.
  handover_otp     text not null default lpad(floor(random() * 10000)::int::text, 4, '0'),
  placed_at        timestamptz not null default now()
);

create index orders_buyer_idx on public.orders (buyer_id);
create index orders_restaurant_idx on public.orders (restaurant_id);
create index orders_rider_idx on public.orders (rider_id);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  menu_item_id  uuid references public.menu_items (id),
  -- Snapshots: menu edits must never rewrite past orders.
  name_snapshot text not null,
  price_rs      integer not null check (price_rs >= 0),
  qty           integer not null check (qty > 0)
);

create index order_items_order_idx on public.order_items (order_id);

-- ═══ Audit trail ═════════════════════════════════════════════════════
-- Every status transition is recorded automatically. This is the
-- dispute-resolution evidence and the "scam-proof" backbone.

create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  actor_id    uuid,
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id);

create function public.log_order_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_events (order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger on_order_status_change
  after insert or update of status on public.orders
  for each row execute function public.log_order_status_change();

-- ═══ Row-Level Security ══════════════════════════════════════════════
-- The database itself enforces who sees what, so a frontend bug can
-- never leak another user's data.

alter table public.profiles        enable row level security;
alter table public.restaurants     enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.order_events    enable row level security;

-- Profiles: you see yourself; admins see everyone. Only name/phone are
-- self-editable — the role column is locked by column grants below.
create policy "profiles: read own, admin reads all" on public.profiles
  for select using (id = auth.uid() or public.my_role() = 'admin');

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke insert, update, delete on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- Restaurants: everyone browses approved ones; owners and admins see
-- their own regardless. `is_approved` is excluded from the column grant
-- so owners cannot approve themselves.
create policy "restaurants: browse approved, own, admin" on public.restaurants
  for select using (
    is_approved
    or owner_id = auth.uid()
    or public.my_role() = 'admin'
  );

create policy "restaurants: owners register" on public.restaurants
  for insert with check (
    owner_id = auth.uid() and public.my_role() in ('restaurant', 'admin')
  );

create policy "restaurants: owners manage" on public.restaurants
  for update using (owner_id = auth.uid() or public.my_role() = 'admin')
  with check (owner_id = auth.uid() or public.my_role() = 'admin');

revoke insert, update, delete on public.restaurants from authenticated, anon;
grant insert (owner_id, name, description, address, lat, lng, min_order_rs, packaging_fee_rs)
  on public.restaurants to authenticated;
grant update (name, description, address, lat, lng, is_open, min_order_rs, packaging_fee_rs)
  on public.restaurants to authenticated;

-- Menu: visible when the restaurant is visible; writable by its owner.
create policy "menu_categories: follow restaurant visibility" on public.menu_categories
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and (r.is_approved or r.owner_id = auth.uid())
    )
    or public.my_role() = 'admin'
  );

create policy "menu_categories: owner writes" on public.menu_categories
  for all using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

create policy "menu_items: follow restaurant visibility" on public.menu_items
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and (r.is_approved or r.owner_id = auth.uid())
    )
    or public.my_role() = 'admin'
  );

create policy "menu_items: owner writes" on public.menu_items
  for all using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

-- Orders: buyers see their own; restaurants see incoming; riders see
-- assigned orders plus the unassigned READY pool; admins see all.
create policy "orders: participants read" on public.orders
  for select using (
    buyer_id = auth.uid()
    or rider_id = auth.uid()
    or exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
    or (public.my_role() = 'rider' and rider_id is null and status = 'ready')
    or public.my_role() = 'admin'
  );

create policy "orders: buyers place" on public.orders
  for insert with check (buyer_id = auth.uid() and status = 'placed');

-- Status transitions happen through server-side functions added in
-- Phase 1 — no direct update policy for normal users on purpose.
create policy "orders: admin updates" on public.orders
  for update using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

-- Order items: visibility mirrors the parent order (its RLS applies
-- inside the subquery); buyers add items only to their own new order.
create policy "order_items: follow order visibility" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id)
  );

create policy "order_items: buyers add to own placed order" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = auth.uid() and o.status = 'placed'
    )
  );

-- Order events: read-only mirror of order visibility. Rows are written
-- only by the SECURITY DEFINER trigger.
create policy "order_events: follow order visibility" on public.order_events
  for select using (
    exists (select 1 from public.orders o where o.id = order_id)
  );

revoke insert, update, delete on public.order_events from authenticated, anon;

-- ═══ Realtime ════════════════════════════════════════════════════════
-- Live order status on the buyer/restaurant/rider screens.

alter publication supabase_realtime add table public.orders;
