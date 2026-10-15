-- DRAFT. Apply only after approval, to a TEST project with 001 and 002 installed.
-- Existing identities, members and earned plant points remain intact.
alter table public.gardens add column owner_id uuid references auth.users(id);
update public.gardens g set owner_id=(select user_id from public.garden_members where garden_id=g.id order by joined_at,user_id limit 1);
create table public.garden_reward_ledger(user_id uuid references auth.users(id) on delete cascade,session_id text,rewarded_at timestamptz not null default now(),primary key(user_id,session_id));
insert into public.garden_reward_ledger select user_id,session_id,created_at from public.garden_contributions on conflict do nothing;
create table public.garden_social_ledger(user_id uuid references auth.users(id) on delete cascade,kind text not null,created_at timestamptz not null default now());
create index garden_social_user_idx on public.garden_social_ledger(user_id,kind,created_at);
alter table public.garden_reward_ledger enable row level security;
alter table public.garden_social_ledger enable row level security;
revoke all on public.garden_reward_ledger,public.garden_social_ledger from public,anon,authenticated;
create policy own_reward_read on public.garden_reward_ledger for select to authenticated using(user_id=auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean,true)=false);
grant select on public.garden_reward_ledger to authenticated;

-- Preserve audited invitation transactions as private helpers; all public entrypoints require email accounts.
alter function public.create_garden(text) rename to legacy_create_garden;
alter function public.create_garden_invite() rename to legacy_create_garden_invite;
alter function public.accept_garden_invite(text,text) rename to legacy_accept_garden_invite;
alter function public.send_rest_invite() rename to legacy_send_rest_invite;
alter function public.begin_rest_invite(uuid) rename to legacy_begin_rest_invite;
alter function public.respond_rest_invite(uuid,text) rename to legacy_respond_rest_invite;
revoke all on function public.legacy_create_garden(text),public.legacy_create_garden_invite(),public.legacy_accept_garden_invite(text,text),public.legacy_send_rest_invite(),public.legacy_begin_rest_invite(uuid),public.legacy_respond_rest_invite(uuid,text) from public,anon,authenticated;
create function public.create_garden(p_nickname text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account();g uuid;
begin g:=public.legacy_create_garden(p_nickname);update public.gardens set owner_id=u where id=g;return g;end;$$;
create function public.create_garden_invite() returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account();token text;
begin
 perform 1 from public.gardens g join public.garden_members m on m.garden_id=g.id where m.user_id=u for update of g;
 perform 1 from auth.users where id=u for update;
 if exists(select 1 from public.garden_social_ledger where user_id=u and kind='link' and created_at>now()-interval '60 seconds') then raise exception 'Wait 60 seconds before another link';end if;
 if (select count(*) from public.garden_social_ledger where user_id=u and kind='link' and (created_at at time zone 'Asia/Shanghai')::date=(now() at time zone 'Asia/Shanghai')::date)>=10 then raise exception 'Daily link limit';end if;
 token:=public.legacy_create_garden_invite();insert into public.garden_social_ledger(user_id,kind) values(u,'link');return token;
end;$$;
create function public.accept_garden_invite(p_token text,p_nickname text) returns uuid language plpgsql security definer set search_path='' as $$
begin perform public.require_permanent_account();return public.legacy_accept_garden_invite(p_token,p_nickname);end;$$;
create function public.send_rest_invite() returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account();result uuid;
begin
 perform 1 from public.gardens g join public.garden_members m on m.garden_id=g.id where m.user_id=u for update of g;
 perform 1 from auth.users where id=u for update;
 if exists(select 1 from public.garden_social_ledger where user_id=u and kind='rest' and created_at>now()-interval '30 minutes') then raise exception 'Wait 30 minutes before another rest invite';end if;
 if (select count(*) from public.garden_social_ledger where user_id=u and kind='rest' and (created_at at time zone 'Asia/Shanghai')::date=(now() at time zone 'Asia/Shanghai')::date)>=3 then raise exception 'Daily rest invitation limit';end if;
 result:=public.legacy_send_rest_invite();insert into public.garden_social_ledger(user_id,kind) values(u,'rest');return result;
end;$$;
create function public.begin_rest_invite(p_invite_id uuid) returns timestamptz language plpgsql security definer set search_path='' as $$
begin perform public.require_permanent_account();return public.legacy_begin_rest_invite(p_invite_id);end;$$;
create function public.respond_rest_invite(p_invite_id uuid,p_response text) returns text language plpgsql security definer set search_path='' as $$
begin perform public.require_permanent_account();return public.legacy_respond_rest_invite(p_invite_id,p_response);end;$$;
create or replace function public.leave_garden() returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account();g uuid;successor uuid;
begin
 select garden_id into g from public.garden_members where user_id=u;if g is null then return false;end if;
 perform 1 from public.gardens where id=g for update;
 delete from public.rest_invites where garden_id=g and (sender_id=u or recipient_id=u);
 delete from public.garden_invites where garden_id=g;
 delete from public.garden_members where garden_id=g and user_id=u;
 select user_id into successor from public.garden_members where garden_id=g order by joined_at,user_id limit 1;
 if successor is null then delete from public.gardens where id=g;else update public.gardens set owner_id=successor where id=g;end if;
 return true;
end;$$;
create or replace function public.complete_garden_activity(p_session_id text,p_activity_id text,p_rest_invite_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account();g uuid;a jsonb;duration integer;r public.rest_invites%rowtype;total integer;today_count integer;garden_created timestamptz;
begin
 select garden_id into g from public.garden_members where user_id=u;if g is null then raise exception 'Not a garden member';end if;
 perform 1 from public.gardens where id=g for update;
 perform 1 from auth.users where id=u for update;
 select count(*) into total from public.garden_contributions where garden_id=g;
 if exists(select 1 from public.garden_reward_ledger where user_id=u and session_id=p_session_id) then return jsonb_build_object('awarded',false,'total',total,'reason','duplicate');end if;
 select count(*) into today_count from public.garden_reward_ledger where user_id=u and (rewarded_at at time zone 'Asia/Shanghai')::date=(now() at time zone 'Asia/Shanghai')::date;
 if today_count>=5 then return jsonb_build_object('awarded',false,'total',total,'reason','daily-limit');end if;
 select payload into a from public.personal_events where user_id=u and kind='sessions' and event_id=p_session_id;
 if a is null or a->>'status'<>'completed' or a->>'activityId'<>p_activity_id then raise exception 'Synced confirmed completion required';end if;
 duration:=case p_activity_id when 'chin-tuck' then 30 when 'scapular-squeeze' then 30 when 'neck-rotation' then 60 when 'seated-twist' then 60 when 'seated-march' then 60 when 'ankle-stretch' then 60 when 'chest-open' then 60 when 'sit-to-stand' then 60 when 'calf-raises' then 60 when 'side-bend' then 60 when 'side-walk' then 180 when 'easy-walk' then 300 else null end;
 select created_at into garden_created from public.gardens where id=g;
 if duration is null or (a->>'completedAt')::timestamptz>now()+interval '1 minute' or (a->>'completedAt')::timestamptz<garden_created or (a->>'completedAt')::timestamptz-(a->>'startedAt')::timestamptz<make_interval(secs=>duration) then raise exception 'Completion fails reward rules';end if;
 if p_rest_invite_id is not null then
 select * into r from public.rest_invites where id=p_rest_invite_id for update;
 if not found or r.garden_id<>g or r.recipient_id<>u or r.status not in ('now','later') or r.participation_started_at is null or now()<r.participation_started_at+interval '60 seconds' then raise exception 'Rest invite unavailable';end if;
 end if;
 insert into public.garden_reward_ledger(user_id,session_id) values(u,p_session_id);
 insert into public.garden_contributions(garden_id,user_id,session_id,activity_id) values(g,u,p_session_id,p_activity_id);
 if p_rest_invite_id is not null then update public.rest_invites set status='participated',activity_session_id=p_session_id where id=p_rest_invite_id;end if;
 return jsonb_build_object('awarded',true,'total',total+1,'today',today_count+1);
end;$$;
create or replace function public.my_garden_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=public.require_permanent_account();g uuid;owner uuid;
begin
 select garden_id into g from public.garden_members where user_id=u;if g is null then return null;end if;
 select owner_id into owner from public.gardens where id=g;
 return jsonb_build_object('id',g,'ownerId',owner,'dailyRewardLimit',5,'myTodayRewards',(select count(*) from public.garden_reward_ledger where user_id=u and (rewarded_at at time zone 'Asia/Shanghai')::date=(now() at time zone 'Asia/Shanghai')::date),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'nickname',m.nickname,'joinedAt',m.joined_at) order by m.joined_at) from public.garden_members m where m.garden_id=g),'[]'::jsonb),
 'contributions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'memberId',case when exists(select 1 from public.garden_members m where m.garden_id=g and m.user_id=c.user_id) then c.user_id::text else 'former-member' end) order by c.created_at) from public.garden_contributions c where c.garden_id=g),'[]'::jsonb),
 'restInvites',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'senderId',r.sender_id,'recipientId',r.recipient_id,'createdAt',r.created_at,'expiresAt',r.expires_at,'status',case when r.status in ('pending','now') and r.expires_at<=now() and r.participation_started_at is null then 'expired' else r.status end,'participationStartedAt',r.participation_started_at) order by r.created_at desc) from public.rest_invites r where r.garden_id=g),'[]'::jsonb));
end;$$;
revoke all on function public.create_garden(text),public.create_garden_invite(),public.accept_garden_invite(text,text),public.send_rest_invite(),public.begin_rest_invite(uuid),public.respond_rest_invite(uuid,text) from public,anon;
grant execute on function public.create_garden(text),public.create_garden_invite(),public.accept_garden_invite(text,text),public.send_rest_invite(),public.begin_rest_invite(uuid),public.respond_rest_invite(uuid,text) to authenticated;
