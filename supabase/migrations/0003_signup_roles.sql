-- FoodVibe — Phase 1.5: portal sign-ups carry their requested role.
-- The restaurant/rider sign-in pages pass requested_role in the signup
-- metadata; anything else (or nothing) stays a buyer. Approval flags
-- are untouched — riders still need admin approval, restaurants still
-- need their listing approved.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role public.user_role := 'buyer';
begin
  if new.raw_user_meta_data ->> 'requested_role' in ('restaurant', 'rider') then
    v_role := (new.raw_user_meta_data ->> 'requested_role')::public.user_role;
  end if;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  );
  return new;
end;
$$;
