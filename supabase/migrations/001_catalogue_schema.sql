-- Run this migration in the Supabase SQL Editor before starting the app.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.catalogues (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  category text not null,
  year integer not null check (year between 2000 and 2100),
  title text not null,
  description text not null default '',
  original_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null default 0,
  pages integer,
  search_text text not null default '',
  compact_search_text text not null default '',
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles(id) on delete set null
);

-- Every Supabase Auth account receives a viewer profile automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index catalogues_company_idx on public.catalogues (company);
create index catalogues_category_idx on public.catalogues (category);
create index catalogues_year_idx on public.catalogues (year desc);
create index catalogues_uploaded_at_idx on public.catalogues (uploaded_at desc);
create index catalogues_search_idx on public.catalogues using gin (to_tsvector('simple', search_text));

insert into storage.buckets (id, name, public) values ('catalogue-pdfs', 'catalogue-pdfs', true)
on conflict (id) do update set public = true;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.catalogues enable row level security;
create policy "Users can read their own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Public catalogue read" on public.catalogues for select using (true);
create policy "Admins insert catalogues" on public.catalogues for insert to authenticated with check (public.is_admin());
create policy "Admins update catalogues" on public.catalogues for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete catalogues" on public.catalogues for delete to authenticated using (public.is_admin());
create policy "Admins upload catalogue files" on storage.objects for insert to authenticated with check (bucket_id = 'catalogue-pdfs' and public.is_admin());
create policy "Admins update catalogue files" on storage.objects for update to authenticated using (bucket_id = 'catalogue-pdfs' and public.is_admin());
create policy "Admins delete catalogue files" on storage.objects for delete to authenticated using (bucket_id = 'catalogue-pdfs' and public.is_admin());

-- After creating a user in Authentication, promote that profile to admin:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
