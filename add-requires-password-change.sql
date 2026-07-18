alter table public.user_profiles
add column if not exists requires_password_change boolean default false;
