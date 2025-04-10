-- Enable the pg_trgm extension for text search
create extension if not exists pg_trgm;

-- Create an enum type for workspace visibility
create type workspace_type as enum ('private', 'public');

-- Create workspaces table
create table public.workspaces (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    type workspace_type default 'private',
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster searches
create index workspaces_name_idx on public.workspaces using gin (name gin_trgm_ops);
create index workspaces_user_id_idx on public.workspaces(user_id);

-- Enable Row Level Security
alter table public.workspaces enable row level security;

-- Policies
-- Users can view their own private workspaces and all public workspaces
create policy "Users can view own private and all public workspaces"
    on public.workspaces for select
    using (
        auth.uid() = user_id 
        or 
        type = 'public'
    );

-- Users can insert their own workspaces
create policy "Users can create their own workspaces"
    on public.workspaces for insert
    with check (auth.uid() = user_id);

-- Users can update their own workspaces
create policy "Users can update own workspaces"
    on public.workspaces for update
    using (auth.uid() = user_id);

-- Users can delete their own workspaces
create policy "Users can delete own workspaces"
    on public.workspaces for delete
    using (auth.uid() = user_id);

-- Function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger handle_workspaces_updated_at
    before update on public.workspaces
    for each row
    execute procedure public.handle_updated_at(); 