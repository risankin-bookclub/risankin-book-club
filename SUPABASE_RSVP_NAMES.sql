-- Выполнить в Supabase SQL Editor один раз. Не удаляет существующие голоса и RSVP.
create table if not exists public.rsvp_participant_names (
 meeting_id text not null,
 participant_id text not null,
 full_name text not null,
 answer text not null check (answer in ('yes','no')),
 updated_at timestamptz not null default now(),
 primary key (meeting_id, participant_id)
);
alter table public.rsvp_participant_names enable row level security;
revoke all on public.rsvp_participant_names from anon, authenticated;
create or replace function public.save_rsvp_participant_name(
 p_meeting_id text, p_participant_id text, p_full_name text, p_answer text
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
 if p_meeting_id <> '2026-11-06'
 or p_participant_id !~ '^[0-9a-f]{64}$'
 or length(btrim(p_full_name)) < 3
 or length(p_full_name) > 150
 or p_answer not in ('yes','no') then
  raise exception 'Invalid RSVP data';
 end if;
 -- Only store names for an RSVP that already exists with the same answer.
 if not exists (
  select 1 from public.rsvp r
  where r.meeting_id=p_meeting_id and r.participant_id=p_participant_id and r.answer=p_answer
 ) then raise exception 'RSVP not found'; end if;
 insert into public.rsvp_participant_names(meeting_id,participant_id,full_name,answer)
 values (p_meeting_id,p_participant_id,btrim(p_full_name),p_answer)
 on conflict (meeting_id,participant_id) do update
 set full_name=excluded.full_name, answer=excluded.answer, updated_at=now();
end;
$$;
revoke all on function public.save_rsvp_participant_name(text,text,text,text) from public;
grant execute on function public.save_rsvp_participant_name(text,text,text,text) to anon;
-- Table Editor → rsvp_participant_names; yes=Буду, no=Не буду.
