-- Drop previous versions to avoid signature conflicts/confusion
drop function if exists public.create_workshop(uuid, text, text);
drop function if exists public.create_workshop(uuid, text, text, text);

-- Create a function to handle atomic workshop creation
create or replace function public.create_workshop(
  owner_id uuid,
  name text,
  slug text,
  subscription_plan_text text
) returns uuid as $$
declare
  new_workshop_id uuid;
begin
  -- 1. Insert the new workshop
  insert into public.workshops (name, slug, subscription_status, subscription_plan)
  values (name, slug, 'active', subscription_plan_text::subscription_plan) 
  returning id into new_workshop_id;

  -- 2. Add the user as the owner of the workshop
  insert into public.workshop_members (user_id, workshop_id, role)
  values (owner_id, new_workshop_id, 'owner');

  return new_workshop_id;
end;
$$ language plpgsql security definer;
