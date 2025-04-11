-- Enable ltree extension for hierarchical paths
create extension if not exists ltree;

-- Add new columns to questions table
alter table public.questions 
    add column if not exists parent_id uuid references public.questions(id) on delete cascade,
    add column if not exists path ltree;

-- Create indexes for the new columns
create index if not exists questions_path_idx on public.questions using gist (path);
create index if not exists questions_parent_id_idx on public.questions(parent_id);

-- Function to update question path
create or replace function public.update_question_path()
returns trigger as $$
begin
    if NEW.parent_id is null then
        NEW.path = text2ltree(NEW.id::text);
    else
        select path || text2ltree(NEW.id::text)
        into NEW.path
        from public.questions
        where id = NEW.parent_id;
    end if;
    return NEW;
end;
$$ language plpgsql;

-- Drop trigger if it exists
drop trigger if exists update_question_path_trigger on public.questions;

-- Create trigger for path updates
create trigger update_question_path_trigger
    before insert or update of parent_id
    on public.questions
    for each row
    execute function public.update_question_path();

-- Initialize paths for existing questions
update public.questions
set path = text2ltree(id::text)
where path is null; 