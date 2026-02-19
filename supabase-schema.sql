-- =============================================
-- FlowDesk Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- =============================================

-- DEPARTMENTS TABLE
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  icon text not null default '📁',
  parent_id uuid references departments(id) on delete cascade,
  created_at timestamptz default now()
);

-- MEMBERS TABLE
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email text,
  avatar_color text,
  created_at timestamptz default now()
);

-- TASKS TABLE
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  dept_id uuid references departments(id) on delete set null,
  status text not null default 'Not Started',
  priority text not null default 'Medium',
  assignee text,
  due_date date,
  recurrence text default 'None',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SUBTASKS TABLE
create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  title text not null,
  done boolean default false,
  created_at timestamptz default now()
);

-- COMMENTS TABLE
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  author text not null default 'Team Member',
  text text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) - makes data accessible to all with anon key
alter table departments enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table comments enable row level security;
alter table members enable row level security;

-- Allow full access with anon key (everyone in org can read/write)
create policy "Allow all for anon" on departments for all using (true) with check (true);
create policy "Allow all for anon" on tasks for all using (true) with check (true);
create policy "Allow all for anon" on subtasks for all using (true) with check (true);
create policy "Allow all for anon" on comments for all using (true) with check (true);
create policy "Allow all for anon" on members for all using (true) with check (true);

-- Auto-update updated_at on tasks
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Seed some initial members (optional - edit these)
insert into members (name, email) values
  ('Alice Chen', 'alice@yourorg.com'),
  ('Bob Kim', 'bob@yourorg.com'),
  ('Sara Lee', 'sara@yourorg.com'),
  ('James Park', 'james@yourorg.com'),
  ('Maria Garcia', 'maria@yourorg.com'),
  ('Tom Wilson', 'tom@yourorg.com')
on conflict (name) do nothing;
