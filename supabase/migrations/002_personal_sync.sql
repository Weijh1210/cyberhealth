-- P1 DRAFT: apply only to an approved TEST project after 001_garden.sql.
-- Additive personal data tables. Existing garden records and auth identities are preserved.
create table public.personal_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0,
 preferences jsonb,
 updated_at timestamptz not null default now()
);
create table public.personal_events (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('sessions','feedback','reminderEvents','recommendationEvents')),
 event_id text not null check(char_length(event_id) between 1 and 250),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=65536),
 created_at timestamptz not null default now(),
 primary key(user_id,kind,event_id)
);
alter table public.personal_settings enable row level security;
alter table public.personal_events enable row level security;
create policy personal_settings_read on public.personal_settings for select to authenticated using(user_id=auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean,true)=false);
create policy personal_events_read on public.personal_events for select to authenticated using(user_id=auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean,true)=false);
revoke all on public.personal_settings,public.personal_events from anon,authenticated;
grant select on public.personal_settings,public.personal_events to authenticated;

create function public.require_permanent_account() returns uuid language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'Permanent account required'; end if;
 return auth.uid();
end;$$;
revoke all on function public.require_permanent_account() from public,anon;
grant execute on function public.require_permanent_account() to authenticated;

create function public.personal_snapshot_v1() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account(); result jsonb; k text;
begin
 select jsonb_build_object('revision',s.revision,'preferences',s.preferences) into result from public.personal_settings s where s.user_id=u;
 result:=coalesce(result,jsonb_build_object('revision',0,'preferences',null));
 foreach k in array array['sessions','feedback','reminderEvents','recommendationEvents'] loop
 result:=result||jsonb_build_object(k,coalesce((select jsonb_agg(e.payload order by e.created_at,e.event_id) from public.personal_events e where e.user_id=u and e.kind=k),'[]'::jsonb));
 end loop;return result;
end;$$;
create function public.sync_personal_v1(p_expected_revision bigint,p_preferences jsonb,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account(); version bigint; k text; item jsonb; item_id text;
begin
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>4194304 then raise exception 'Invalid sync payload'; end if;
 insert into public.personal_settings(user_id) values(u) on conflict do nothing;
 select revision into version from public.personal_settings where user_id=u for update;
 if p_preferences is not null and p_preferences<>'null'::jsonb then
 if p_expected_revision is null or p_expected_revision<>version then raise exception 'Preference conflict: reload before choosing'; end if;
 if jsonb_typeof(p_preferences)<>'object' or coalesce(jsonb_typeof(p_preferences->'profile'),'null')<>'object' or coalesce(jsonb_typeof(p_preferences->'reminder'),'null')<>'object' or octet_length(p_preferences::text)>32768 then raise exception 'Invalid preferences'; end if;
 update public.personal_settings set preferences=p_preferences,revision=revision+1,updated_at=now() where user_id=u;
 end if;
 foreach k in array array['sessions','feedback','reminderEvents','recommendationEvents'] loop
 if jsonb_typeof(coalesce(p_payload->k,'[]'::jsonb))<>'array' then raise exception 'Expected array'; end if;
 if jsonb_array_length(coalesce(p_payload->k,'[]'::jsonb))>5000 then raise exception 'Sync batch too large'; end if;
 for item in select value from jsonb_array_elements(coalesce(p_payload->k,'[]'::jsonb)) loop
 item_id:=item->>'id';
 if item_id is null or jsonb_typeof(item)<>'object' then raise exception 'Event ID required'; end if;
 if k='sessions' and (coalesce(item->>'status','') not in ('completed','exited') or item->>'activityId' is null or item->>'startedAt' is null or (item->>'status'='completed' and item->>'completedAt' is null)) then raise exception 'Only terminal activity events can sync'; end if;
 -- Immutable events: the cloud's existing version is retained on duplicate imports.
 insert into public.personal_events(user_id,kind,event_id,payload) values(u,k,item_id,item) on conflict do nothing;
 end loop;
 end loop;return public.personal_snapshot_v1();
end;$$;
revoke all on function public.personal_snapshot_v1(),public.sync_personal_v1(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.personal_snapshot_v1(),public.sync_personal_v1(bigint,jsonb,jsonb) to authenticated;
