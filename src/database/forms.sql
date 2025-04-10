-- Create enum for question types
create type question_type as enum (
    'multiple-choice',
    'dropdown',
    'yes-no',
    'checkbox',
    'short-text',
    'long-text',
    'email',
    'phone',
    'address',
    'website',
    'date'
);

-- Create forms table
create table public.forms (
    id uuid default gen_random_uuid() primary key,
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    name text not null,
    description text,
    is_private boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create questions table
create table public.questions (
    id uuid default gen_random_uuid() primary key,
    form_id uuid references public.forms(id) on delete cascade not null,
    type question_type not null,
    text text not null,
    description text,
    is_required boolean default false,
    max_chars integer,
    "order" integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create question choices table
create table public.question_choices (
    id uuid default gen_random_uuid() primary key,
    question_id uuid references public.questions(id) on delete cascade not null,
    text text not null,
    "order" integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create form settings table
create table public.form_settings (
    id uuid default gen_random_uuid() primary key,
    form_id uuid references public.forms(id) on delete cascade not null unique,
    landing_page_title text not null,
    landing_page_description text,
    landing_page_button_text text not null,
    show_progress_bar boolean default true,
    ending_page_title text not null,
    ending_page_description text,
    ending_page_button_text text not null,
    redirect_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index forms_workspace_id_idx on public.forms(workspace_id);
create index questions_form_id_idx on public.questions(form_id);
create index question_choices_question_id_idx on public.question_choices(question_id);

-- Enable Row Level Security
alter table public.forms enable row level security;
alter table public.questions enable row level security;
alter table public.question_choices enable row level security;
alter table public.form_settings enable row level security;

-- RLS Policies for forms
create policy "Users can view forms in their workspaces"
    on public.forms for select
    using (
        exists (
            select 1 from public.workspaces w
            where w.id = forms.workspace_id
            and (w.user_id = auth.uid() or (not forms.is_private and w.type = 'public'))
        )
    );

create policy "Users can create forms in their workspaces"
    on public.forms for insert
    with check (
        exists (
            select 1 from public.workspaces w
            where w.id = workspace_id
            and w.user_id = auth.uid()
        )
    );

create policy "Users can update forms in their workspaces"
    on public.forms for update
    using (
        exists (
            select 1 from public.workspaces w
            where w.id = workspace_id
            and w.user_id = auth.uid()
        )
    );

create policy "Users can delete forms in their workspaces"
    on public.forms for delete
    using (
        exists (
            select 1 from public.workspaces w
            where w.id = workspace_id
            and w.user_id = auth.uid()
        )
    );

-- RLS Policies for questions (inherit from forms)
create policy "Inherit form access for questions"
    on public.questions for all
    using (
        exists (
            select 1 from public.forms f
            inner join public.workspaces w on w.id = f.workspace_id
            where f.id = form_id
            and (w.user_id = auth.uid() or (not f.is_private and w.type = 'public'))
        )
    );

-- RLS Policies for question choices (inherit from questions)
create policy "Inherit question access for choices"
    on public.question_choices for all
    using (
        exists (
            select 1 from public.questions q
            inner join public.forms f on f.id = q.form_id
            inner join public.workspaces w on w.id = f.workspace_id
            where q.id = question_id
            and (w.user_id = auth.uid() or (not f.is_private and w.type = 'public'))
        )
    );

-- RLS Policies for form settings (inherit from forms)
create policy "Inherit form access for settings"
    on public.form_settings for all
    using (
        exists (
            select 1 from public.forms f
            inner join public.workspaces w on w.id = f.workspace_id
            where f.id = form_id
            and (w.user_id = auth.uid() or (not f.is_private and w.type = 'public'))
        )
    );

-- Function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_forms_updated_at
    before update on public.forms
    for each row
    execute procedure public.handle_updated_at();

create trigger handle_questions_updated_at
    before update on public.questions
    for each row
    execute procedure public.handle_updated_at();

create trigger handle_question_choices_updated_at
    before update on public.question_choices
    for each row
    execute procedure public.handle_updated_at();

create trigger handle_form_settings_updated_at
    before update on public.form_settings
    for each row
    execute procedure public.handle_updated_at(); 