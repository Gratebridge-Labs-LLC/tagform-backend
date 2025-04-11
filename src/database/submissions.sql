-- Create form submissions table
create table public.form_submissions (
    id uuid default gen_random_uuid() primary key,
    form_id uuid references public.forms(id) on delete cascade not null,
    email text not null,
    submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
    ip_address text,
    user_agent text,
    completion_time integer, -- Time taken to complete form in seconds
    
    -- Enforce one submission per email per form
    unique(form_id, email)
);

-- Create question responses table
create table public.question_responses (
    id uuid default gen_random_uuid() primary key,
    submission_id uuid references public.form_submissions(id) on delete cascade not null,
    question_id uuid references public.questions(id) on delete cascade not null,
    response_text text, -- For text-based questions
    choice_id uuid references public.question_choices(id) on delete set null, -- For choice-based questions
    submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create submission analytics table for caching aggregated data
create table public.form_analytics (
    id uuid default gen_random_uuid() primary key,
    form_id uuid references public.forms(id) on delete cascade not null,
    total_submissions integer not null default 0,
    average_completion_time integer, -- Average time in seconds
    last_submission_at timestamp with time zone,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create question analytics table for caching per-question stats
create table public.question_analytics (
    id uuid default gen_random_uuid() primary key,
    question_id uuid references public.questions(id) on delete cascade not null,
    total_responses integer not null default 0,
    -- For choice questions
    choice_distribution jsonb, -- Store choice counts as JSON
    -- For text questions
    average_response_length integer,
    common_responses jsonb, -- Store most common responses and their counts
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index form_submissions_form_id_idx on public.form_submissions(form_id);
create index form_submissions_email_idx on public.form_submissions(email);
create index question_responses_submission_id_idx on public.question_responses(submission_id);
create index question_responses_question_id_idx on public.question_responses(question_id);
create index form_analytics_form_id_idx on public.form_analytics(form_id);
create index question_analytics_question_id_idx on public.question_analytics(question_id);

-- Enable RLS
alter table public.form_submissions enable row level security;
alter table public.question_responses enable row level security;
alter table public.form_analytics enable row level security;
alter table public.question_analytics enable row level security;

-- RLS Policies
create policy "Users can view their own submissions"
    on public.form_submissions for select
    using (
        email = current_user
        or exists (
            select 1 from public.forms f
            inner join public.workspaces w on w.id = f.workspace_id
            where f.id = form_submissions.form_id
            and w.user_id = auth.uid()
        )
    );

create policy "Users can create their own submissions"
    on public.form_submissions for insert
    with check (true); -- Anyone can submit, but email uniqueness is enforced

create policy "Form owners can view all responses"
    on public.question_responses for select
    using (
        exists (
            select 1 from public.form_submissions fs
            inner join public.forms f on f.id = fs.form_id
            inner join public.workspaces w on w.id = f.workspace_id
            where fs.id = question_responses.submission_id
            and (w.user_id = auth.uid() or fs.email = current_user)
        )
    );

create policy "Users can create their own responses"
    on public.question_responses for insert
    with check (
        exists (
            select 1 from public.form_submissions fs
            where fs.id = submission_id
            and fs.email = current_user
        )
    );

create policy "Form owners can view analytics"
    on public.form_analytics for select
    using (
        exists (
            select 1 from public.forms f
            inner join public.workspaces w on w.id = f.workspace_id
            where f.id = form_analytics.form_id
            and w.user_id = auth.uid()
        )
    );

create policy "Form owners can view question analytics"
    on public.question_analytics for select
    using (
        exists (
            select 1 from public.questions q
            inner join public.forms f on f.id = q.form_id
            inner join public.workspaces w on w.id = f.workspace_id
            where q.id = question_analytics.question_id
            and w.user_id = auth.uid()
        )
    );

-- Function to update analytics after submission
create or replace function public.update_form_analytics()
returns trigger as $$
begin
    -- Update form analytics
    insert into public.form_analytics (form_id, total_submissions, average_completion_time, last_submission_at)
    select
        form_id,
        count(*),
        avg(completion_time),
        max(submitted_at)
    from public.form_submissions
    where form_id = NEW.form_id
    group by form_id
    on conflict (form_id) do update
    set
        total_submissions = EXCLUDED.total_submissions,
        average_completion_time = EXCLUDED.average_completion_time,
        last_submission_at = EXCLUDED.last_submission_at,
        updated_at = now();
    
    return NEW;
end;
$$ language plpgsql;

-- Function to update question analytics
create or replace function public.update_question_analytics()
returns trigger as $$
declare
    q_type question_type;
begin
    -- Get question type
    select type into q_type
    from public.questions
    where id = NEW.question_id;

    -- Update question analytics
    insert into public.question_analytics (
        question_id,
        total_responses,
        choice_distribution,
        average_response_length,
        common_responses
    )
    select
        NEW.question_id,
        count(*),
        case
            when q_type in ('multiple-choice', 'dropdown', 'yes-no', 'checkbox') then
                jsonb_object_agg(
                    coalesce(qc.text, 'No response'),
                    count(*)
                )
            else null
        end,
        case
            when q_type in ('short-text', 'long-text', 'email', 'phone', 'address', 'website') then
                avg(length(response_text))
            else null
        end,
        case
            when q_type in ('short-text', 'long-text', 'email', 'phone', 'address', 'website') then
                jsonb_object_agg(
                    response_text,
                    count(*)
                )
            else null
        end
    from public.question_responses qr
    left join public.question_choices qc on qc.id = qr.choice_id
    where question_id = NEW.question_id
    group by question_id
    on conflict (question_id) do update
    set
        total_responses = EXCLUDED.total_responses,
        choice_distribution = EXCLUDED.choice_distribution,
        average_response_length = EXCLUDED.average_response_length,
        common_responses = EXCLUDED.common_responses,
        updated_at = now();
    
    return NEW;
end;
$$ language plpgsql;

-- Triggers for analytics
create trigger update_form_analytics_after_submission
    after insert on public.form_submissions
    for each row
    execute procedure public.update_form_analytics();

create trigger update_question_analytics_after_response
    after insert on public.question_responses
    for each row
    execute procedure public.update_question_analytics(); 