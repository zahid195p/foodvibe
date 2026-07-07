-- FoodVibe — Phase 1: order lifecycle RPCs, role requests, rider approval.
-- All order writes now go through SECURITY DEFINER functions so every
-- transition is validated server-side; clients can no longer write orders
-- directly.

-- ═══ Rider approval flag ═════════════════════════════════════════════

alter table public.profiles
  add column is_approved boolean not null default false;

-- ═══ Handover OTP moves to a buyer-only table ════════════════════════
-- If it stayed on orders, an assigned rider could read it through the
-- API and defeat the proof-of-delivery check.

create table public.order_secrets (
  order_id     uuid primary key references public.orders (id) on delete cascade,
  handover_otp text not null default lpad(floor(random() * 10000)::int::text, 4, '0')
);

alter table public.order_secrets enable row level security;

create policy "order_secrets: buyer only" on public.order_secrets
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = auth.uid()
    )
  );

revoke insert, update, delete on public.order_secrets from authenticated, anon;

alter table public.orders drop column handover_otp;

-- ═══ Role requests ═══════════════════════════════════════════════════

create function public.request_role(p_role public.user_role)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_role not in ('restaurant', 'rider') then
    raise exception 'can only request the restaurant or rider role';
  end if;
  update public.profiles
     set role = p_role, is_approved = false
   where id = auth.uid() and role in ('buyer', 'restaurant', 'rider');
end;
$$;

create function public.admin_set_role(
  p_user uuid,
  p_role public.user_role,
  p_approved boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.my_role() <> 'admin' then
    raise exception 'admin only';
  end if;
  update public.profiles
     set role = p_role, is_approved = p_approved
   where id = p_user;
end;
$$;

-- Admin needs to list every profile for the approval queues; the
-- existing select policy already allows that via my_role() = 'admin'.

-- ═══ Restaurant approval (admin) ═════════════════════════════════════

create function public.admin_approve_restaurant(
  p_restaurant uuid,
  p_approved boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.my_role() <> 'admin' then
    raise exception 'admin only';
  end if;
  update public.restaurants
     set is_approved = p_approved
   where id = p_restaurant;
end;
$$;

-- ═══ Placing an order ════════════════════════════════════════════════
-- Prices come from the menu, never from the client. Totals are computed
-- here, so a tampered request cannot change what anyone pays.

create function public.place_order(
  p_restaurant uuid,
  p_items      jsonb,   -- [{"menu_item_id": "...", "qty": 2}, ...]
  p_address    text,
  p_lat        double precision default null,
  p_lng        double precision default null,
  p_note       text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_buyer    uuid := auth.uid();
  v_rest     public.restaurants%rowtype;
  v_item     record;
  v_menu     public.menu_items%rowtype;
  v_subtotal integer := 0;
  v_delivery integer := 100;  -- flat launch delivery fee, Rs
  v_order_id uuid;
begin
  if v_buyer is null then
    raise exception 'sign in to place an order';
  end if;

  select * into v_rest from public.restaurants where id = p_restaurant;
  if not found or not v_rest.is_approved then
    raise exception 'restaurant not available';
  end if;
  if not v_rest.is_open then
    raise exception 'restaurant is currently closed';
  end if;

  if p_address is null or length(trim(p_address)) < 10 then
    raise exception 'delivery address is too short';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;

  insert into public.orders
    (buyer_id, restaurant_id, status, subtotal_rs, delivery_fee_rs,
     packaging_fee_rs, total_rs, delivery_address, delivery_lat,
     delivery_lng, note)
  values
    (v_buyer, p_restaurant, 'placed', 0, v_delivery,
     v_rest.packaging_fee_rs, 0, trim(p_address), p_lat,
     p_lng, coalesce(p_note, ''))
  returning id into v_order_id;

  insert into public.order_secrets (order_id) values (v_order_id);

  for v_item in
    select * from jsonb_to_recordset(p_items) as t(menu_item_id uuid, qty integer)
  loop
    if coalesce(v_item.qty, 0) < 1 or v_item.qty > 50 then
      raise exception 'invalid quantity';
    end if;
    select * into v_menu
      from public.menu_items
     where id = v_item.menu_item_id
       and restaurant_id = p_restaurant
       and is_available;
    if not found then
      raise exception 'an item in your cart is no longer available';
    end if;
    insert into public.order_items (order_id, menu_item_id, name_snapshot, price_rs, qty)
    values (v_order_id, v_menu.id, v_menu.name, v_menu.price_rs, v_item.qty);
    v_subtotal := v_subtotal + v_menu.price_rs * v_item.qty;
  end loop;

  if v_subtotal < v_rest.min_order_rs then
    raise exception 'order is below the minimum of Rs %', v_rest.min_order_rs;
  end if;

  update public.orders
     set subtotal_rs = v_subtotal,
         total_rs    = v_subtotal + v_delivery + v_rest.packaging_fee_rs
   where id = v_order_id;

  return v_order_id;
end;
$$;

-- Buyer can read their own order's handover code (to give the rider).
create function public.get_handover_otp(p_order uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select s.handover_otp
    from public.order_secrets s
    join public.orders o on o.id = s.order_id
   where s.order_id = p_order and o.buyer_id = auth.uid()
$$;

-- ═══ Status transitions ══════════════════════════════════════════════

create function public.restaurant_set_status(
  p_order uuid,
  p_to    public.order_status
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select o.* into v_order
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
   where o.id = p_order
     and (r.owner_id = auth.uid() or public.my_role() = 'admin');
  if not found then
    raise exception 'order not found';
  end if;
  if not (
       (v_order.status = 'placed'    and p_to in ('accepted', 'rejected'))
    or (v_order.status = 'accepted'  and p_to in ('preparing', 'ready'))
    or (v_order.status = 'preparing' and p_to = 'ready')
  ) then
    raise exception 'invalid transition % -> %', v_order.status, p_to;
  end if;
  update public.orders set status = p_to where id = p_order;
end;
$$;

create function public.rider_accept(p_order uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_updated integer;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.role <> 'rider' or not v_profile.is_approved then
    raise exception 'only approved riders can accept deliveries';
  end if;
  update public.orders
     set rider_id = auth.uid(), status = 'rider_assigned'
   where id = p_order and status = 'ready' and rider_id is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'this delivery was already taken';
  end if;
end;
$$;

create function public.rider_set_status(
  p_order uuid,
  p_to    public.order_status,
  p_otp   text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_otp   text;
begin
  select * into v_order
    from public.orders
   where id = p_order and rider_id = auth.uid();
  if not found then
    raise exception 'not your delivery';
  end if;

  if v_order.status = 'rider_assigned' and p_to = 'picked_up' then
    update public.orders set status = 'picked_up' where id = p_order;
  elsif v_order.status = 'picked_up' and p_to = 'delivered' then
    select handover_otp into v_otp
      from public.order_secrets where order_id = p_order;
    if p_otp is distinct from v_otp then
      raise exception 'wrong handover code — ask the customer for the 4-digit code';
    end if;
    update public.orders set status = 'delivered' where id = p_order;
  else
    raise exception 'invalid transition % -> %', v_order.status, p_to;
  end if;
end;
$$;

create function public.buyer_cancel(p_order uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.orders
     set status = 'cancelled'
   where id = p_order and buyer_id = auth.uid() and status = 'placed';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'orders can only be cancelled before the restaurant accepts';
  end if;
end;
$$;

create function public.admin_set_order_status(
  p_order uuid,
  p_to    public.order_status
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.my_role() <> 'admin' then
    raise exception 'admin only';
  end if;
  update public.orders set status = p_to where id = p_order;
end;
$$;

-- ═══ Close the direct-write paths ════════════════════════════════════

drop policy "orders: buyers place" on public.orders;
drop policy "orders: admin updates" on public.orders;
drop policy "order_items: buyers add to own placed order" on public.order_items;

revoke insert, update, delete on public.orders from authenticated, anon;
revoke insert, update, delete on public.order_items from authenticated, anon;
