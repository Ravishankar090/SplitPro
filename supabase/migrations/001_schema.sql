-- ============================================================
-- FamKit Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Groups ────────────────────────────────────────────────
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  created_at  timestamptz default now()
);

-- ── Profiles (extends auth.users) ─────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '',
  phone        text,
  group_id     uuid references public.groups(id),
  avatar_color text not null default '#1E3A1E',
  created_at   timestamptz default now()
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Bills ──────────────────────────────────────────────────
create table public.bills (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references public.groups(id) on delete cascade,
  title               text not null,
  amount              numeric(10,2) not null check (amount > 0),
  paid_by             uuid not null references public.profiles(id),
  date                date not null default current_date,
  is_recurring        boolean not null default false,
  recurring_freq      text check (recurring_freq in ('weekly','monthly','quarterly','yearly')),
  recurring_next_due  date,
  recurring_status    text not null default 'upcoming' check (recurring_status in ('upcoming','due')),
  created_by          uuid not null references public.profiles(id),
  created_at          timestamptz default now()
);

-- ── Bill splits ────────────────────────────────────────────
create table public.bill_splits (
  id         uuid primary key default gen_random_uuid(),
  bill_id    uuid not null references public.bills(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  amount     numeric(10,2) not null check (amount >= 0),
  is_payer   boolean not null default false,
  settled    boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz default now(),
  unique (bill_id, user_id)
);

-- ── Bill history (recurring payments) ─────────────────────
create table public.bill_history (
  id         uuid primary key default gen_random_uuid(),
  bill_id    uuid not null references public.bills(id) on delete cascade,
  month      text not null,
  amount     numeric(10,2) not null,
  paid       boolean not null default false,
  paid_by    uuid references public.profiles(id),
  note       text,
  created_at timestamptz default now()
);

-- ── Shopping items ─────────────────────────────────────────
create table public.shopping_items (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  name         text not null,
  qty          numeric(10,2) not null default 1,
  unit         text not null default '',
  store        text not null,
  requested_by uuid not null references public.profiles(id),
  status       text not null default 'pending' check (status in ('pending','done')),
  bought_by    uuid references public.profiles(id),
  price        numeric(10,2),
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.groups        enable row level security;
alter table public.profiles      enable row level security;
alter table public.bills         enable row level security;
alter table public.bill_splits   enable row level security;
alter table public.bill_history  enable row level security;
alter table public.shopping_items enable row level security;

-- Helper: get the group_id of the current user
create or replace function public.my_group_id()
returns uuid language sql stable security definer as $$
  select group_id from public.profiles where id = auth.uid()
$$;

-- Groups: members can read their own group
create policy "group_select" on public.groups
  for select using (id = my_group_id());

create policy "group_insert" on public.groups
  for insert with check (true);  -- anyone can create a group

create policy "group_update" on public.groups
  for update using (id = my_group_id());

-- Profiles: can read members of own group
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or group_id = my_group_id()
  );

create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on public.profiles
  for update using (id = auth.uid());

-- Bills: group members only
create policy "bills_select" on public.bills
  for select using (group_id = my_group_id());

create policy "bills_insert" on public.bills
  for insert with check (group_id = my_group_id());

create policy "bills_update" on public.bills
  for update using (group_id = my_group_id());

create policy "bills_delete" on public.bills
  for delete using (group_id = my_group_id());

-- Splits: group members only
create policy "splits_select" on public.bill_splits
  for select using (
    exists (select 1 from public.bills b
      where b.id = bill_id and b.group_id = my_group_id())
  );

create policy "splits_insert" on public.bill_splits
  for insert with check (
    exists (select 1 from public.bills b
      where b.id = bill_id and b.group_id = my_group_id())
  );

create policy "splits_update" on public.bill_splits
  for update using (
    exists (select 1 from public.bills b
      where b.id = bill_id and b.group_id = my_group_id())
  );

-- History: group members only
create policy "history_select" on public.bill_history
  for select using (
    exists (select 1 from public.bills b
      where b.id = bill_id and b.group_id = my_group_id())
  );

create policy "history_insert" on public.bill_history
  for insert with check (
    exists (select 1 from public.bills b
      where b.id = bill_id and b.group_id = my_group_id())
  );

-- Shopping: group members only
create policy "shopping_select" on public.shopping_items
  for select using (group_id = my_group_id());

create policy "shopping_insert" on public.shopping_items
  for insert with check (group_id = my_group_id());

create policy "shopping_update" on public.shopping_items
  for update using (group_id = my_group_id());

create policy "shopping_delete" on public.shopping_items
  for delete using (group_id = my_group_id());

-- ============================================================
-- Indexes for performance
-- ============================================================

create index bills_group_id_idx        on public.bills(group_id);
create index bills_paid_by_idx         on public.bills(paid_by);
create index bill_splits_bill_id_idx   on public.bill_splits(bill_id);
create index bill_splits_user_id_idx   on public.bill_splits(user_id);
create index bill_splits_settled_idx   on public.bill_splits(settled);
create index bill_history_bill_id_idx  on public.bill_history(bill_id);
create index shopping_group_id_idx     on public.shopping_items(group_id);
create index shopping_status_idx       on public.shopping_items(status);
create index shopping_store_idx        on public.shopping_items(store);

-- ============================================================
-- Enable Realtime on shopping_items (for live list updates)
-- ============================================================

alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.bill_splits;
