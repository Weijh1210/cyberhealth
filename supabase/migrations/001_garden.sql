-- Apply in a Supabase project. Anonymous Auth users have the authenticated role.
create extension if not exists pgcrypto;

create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.garden_members (
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  joined_at timestamptz not null default now(),
  primary key(garden_id,user_id),
  unique(user_id)
);
create table if not exists public.garden_invites (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  status text not null default 'pending' check(status in ('pending','accepted')),
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists public.rest_invites (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  status text not null default 'pending' check(status in ('pending','now','later','ignored','participated')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  activity_session_id text,
  participation_started_at timestamptz
);
create table if not exists public.garden_contributions (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  session_id text not null check(char_length(session_id) between 8 and 100),
  activity_id text not null check(char_length(activity_id) between 2 and 80),
  created_at timestamptz not null default now(),
  unique(user_id,session_id)
);
create index if not exists garden_contributions_garden_idx on public.garden_contributions(garden_id,created_at);
create index if not exists rest_invites_garden_idx on public.rest_invites(garden_id,created_at);

alter table public.gardens enable row level security;
alter table public.garden_members enable row level security;
alter table public.garden_invites enable row level security;
alter table public.rest_invites enable row level security;
alter table public.garden_contributions enable row level security;

create or replace function public.is_garden_member(p_garden_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.garden_members m where m.garden_id=p_garden_id and m.user_id=auth.uid()
  );
$$;
revoke all on function public.is_garden_member(uuid) from public,anon;
grant execute on function public.is_garden_member(uuid) to authenticated;

create policy garden_member_read on public.gardens for select to authenticated using (public.is_garden_member(id));
create policy garden_members_read on public.garden_members for select to authenticated using (public.is_garden_member(garden_id));
create policy garden_contributions_read on public.garden_contributions for select to authenticated using (public.is_garden_member(garden_id));
create policy rest_invites_read on public.rest_invites for select to authenticated using (public.is_garden_member(garden_id));
-- Link tokens are only returned by create_garden_invite and consumed by accept_garden_invite.
-- No direct SELECT policy is granted on garden_invites.
revoke all on public.gardens,public.garden_members,public.garden_invites,public.rest_invites,public.garden_contributions from anon;
revoke insert,update,delete on public.gardens,public.garden_members,public.garden_invites,public.rest_invites,public.garden_contributions from authenticated;
grant select on public.gardens,public.garden_members,public.rest_invites to authenticated;
-- Members may count contributions, but cannot read activity/session IDs or exact times.
grant select(id,garden_id,user_id) on public.garden_contributions to authenticated;

create or replace function public.create_garden(p_nickname text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if char_length(trim(coalesce(p_nickname,''))) not between 1 and 24 then raise exception 'Nickname must be 1 to 24 characters'; end if;
 if exists(select 1 from public.garden_members where user_id=v_user) then raise exception 'Already in a garden'; end if;
 insert into public.gardens default values returning id into v_id;
 insert into public.garden_members(garden_id,user_id,nickname) values(v_id,v_user,trim(p_nickname));
 return v_id;
end;$$;

create or replace function public.create_garden_invite()
returns text language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_garden uuid; v_token text;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select garden_id into v_garden from public.garden_members where user_id=v_user;
 if v_garden is null then raise exception 'Not a garden member'; end if;
 perform 1 from public.gardens where id=v_garden for update;
 if (select count(*) from public.garden_members where garden_id=v_garden)>=2 then raise exception 'Garden is full'; end if;
 v_token:=encode(public.gen_random_bytes(24),'hex');
 insert into public.garden_invites(garden_id,inviter_id,token,expires_at) values(v_garden,v_user,v_token,now()+interval '7 days');
 return v_token;
end;$$;

create or replace function public.accept_garden_invite(p_token text,p_nickname text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_invite public.garden_invites%rowtype;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if char_length(trim(coalesce(p_nickname,''))) not between 1 and 24 then raise exception 'Nickname must be 1 to 24 characters'; end if;
 if exists(select 1 from public.garden_members where user_id=v_user) then raise exception 'Already in a garden'; end if;
 select * into v_invite from public.garden_invites where token=p_token;
 if not found then raise exception 'Invite not found'; end if;
 perform 1 from public.gardens where id=v_invite.garden_id for update;
 select * into v_invite from public.garden_invites where id=v_invite.id for update;
 if v_invite.status<>'pending' or v_invite.expires_at<=now() then raise exception 'Invite expired or already used'; end if;
 if v_invite.inviter_id=v_user then raise exception 'Cannot accept your own invite'; end if;
 if (select count(*) from public.garden_members where garden_id=v_invite.garden_id)>=2 then raise exception 'Garden is full'; end if;
 insert into public.garden_members(garden_id,user_id,nickname) values(v_invite.garden_id,v_user,trim(p_nickname));
 update public.garden_invites set status='accepted',accepted_by=v_user where id=v_invite.id;
 return v_invite.garden_id;
end;$$;

create or replace function public.leave_garden()
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_garden uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select garden_id into v_garden from public.garden_members where user_id=v_user;
 if v_garden is null then return false; end if;
 perform 1 from public.gardens where id=v_garden for update;
 delete from public.rest_invites where garden_id=v_garden and (sender_id=v_user or recipient_id=v_user);
 delete from public.garden_invites where garden_id=v_garden and inviter_id=v_user;
 delete from public.garden_contributions where garden_id=v_garden and user_id=v_user;
 delete from public.garden_members where garden_id=v_garden and user_id=v_user;
 if not exists(select 1 from public.garden_members where garden_id=v_garden) then delete from public.gardens where id=v_garden; end if;
 return true;
end;$$;

create or replace function public.send_rest_invite()
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_garden uuid; v_recipient uuid; v_id uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select garden_id into v_garden from public.garden_members where user_id=v_user;
 if v_garden is null then raise exception 'Not a garden member'; end if;
 select user_id into v_recipient from public.garden_members where garden_id=v_garden and user_id<>v_user;
 if v_recipient is null then raise exception 'Invite a second member first'; end if;
 insert into public.rest_invites(garden_id,sender_id,recipient_id,expires_at)
 values(v_garden,v_user,v_recipient,now()+interval '10 minutes') returning id into v_id;
 return v_id;
end;$$;

create or replace function public.respond_rest_invite(p_invite_id uuid,p_response text)
returns text language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_invite public.rest_invites%rowtype;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_response not in ('now','later','ignored') then raise exception 'Invalid response'; end if;
 select * into v_invite from public.rest_invites where id=p_invite_id for update;
 if not found or v_invite.recipient_id<>v_user or not public.is_garden_member(v_invite.garden_id) then raise exception 'Invite not available'; end if;
 if v_invite.status<>'pending' or v_invite.expires_at<=now() then raise exception 'Invite expired or already answered'; end if;
 update public.rest_invites set status=p_response,responded_at=now() where id=p_invite_id;
 return p_response;
end;$$;

create or replace function public.begin_rest_invite(p_invite_id uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_invite public.rest_invites%rowtype; v_started timestamptz;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select * into v_invite from public.rest_invites where id=p_invite_id for update;
 if not found or v_invite.recipient_id<>v_user or not public.is_garden_member(v_invite.garden_id) or v_invite.status not in ('now','later') or (v_invite.status='now' and v_invite.expires_at<=now() and v_invite.participation_started_at is null) then raise exception 'Rest invite is not available'; end if;
 v_started:=coalesce(v_invite.participation_started_at,now());
 update public.rest_invites set participation_started_at=v_started where id=p_invite_id;
 return v_started;
end;$$;

create or replace function public.complete_garden_activity(p_session_id text,p_activity_id text,p_rest_invite_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_garden uuid; v_rows integer; v_rest public.rest_invites%rowtype; v_total integer;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if char_length(coalesce(p_session_id,'')) not between 8 and 100 or char_length(coalesce(p_activity_id,'')) not between 2 and 80 then raise exception 'Invalid activity session'; end if;
 select garden_id into v_garden from public.garden_members where user_id=v_user;
 if v_garden is null then raise exception 'Not a garden member'; end if;
 if p_rest_invite_id is not null then
  select * into v_rest from public.rest_invites where id=p_rest_invite_id for update;
  if not found or v_rest.garden_id<>v_garden or v_rest.recipient_id<>v_user or v_rest.status not in ('now','later') or v_rest.participation_started_at is null or now()<v_rest.participation_started_at+interval '60 seconds' then
   raise exception 'Rest invite is not available';
  end if;
 end if;
 insert into public.garden_contributions(garden_id,user_id,session_id,activity_id)
 values(v_garden,v_user,p_session_id,p_activity_id) on conflict(user_id,session_id) do nothing;
 get diagnostics v_rows=row_count;
 if v_rows=1 and p_rest_invite_id is not null then
  update public.rest_invites set status='participated',activity_session_id=p_session_id where id=p_rest_invite_id;
 end if;
 select count(*) into v_total from public.garden_contributions where garden_id=v_garden;
 return jsonb_build_object('awarded',v_rows=1,'total',v_total);
end;$$;

create or replace function public.my_garden_snapshot()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_garden uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select garden_id into v_garden from public.garden_members where user_id=v_user;
 if v_garden is null then return null; end if;
 return jsonb_build_object(
  'id',v_garden,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'nickname',m.nickname,'joinedAt',m.joined_at) order by m.joined_at) from public.garden_members m where m.garden_id=v_garden),'[]'::jsonb),
  'contributions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'memberId',c.user_id) order by c.created_at) from public.garden_contributions c where c.garden_id=v_garden),'[]'::jsonb),
  'restInvites',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'senderId',r.sender_id,'recipientId',r.recipient_id,'createdAt',r.created_at,'expiresAt',r.expires_at,'status',case when r.status in ('pending','now') and r.expires_at<=now() then 'expired' else r.status end,'activitySessionId',r.activity_session_id,'participationStartedAt',r.participation_started_at) order by r.created_at desc) from public.rest_invites r where r.garden_id=v_garden),'[]'::jsonb)
 );
end;$$;

revoke all on function public.create_garden(text),public.create_garden_invite(),public.accept_garden_invite(text,text),public.leave_garden(),public.send_rest_invite(),public.begin_rest_invite(uuid),public.respond_rest_invite(uuid,text),public.complete_garden_activity(text,text,uuid),public.my_garden_snapshot() from public,anon;
grant execute on function public.create_garden(text),public.create_garden_invite(),public.accept_garden_invite(text,text),public.leave_garden(),public.send_rest_invite(),public.begin_rest_invite(uuid),public.respond_rest_invite(uuid,text),public.complete_garden_activity(text,text,uuid),public.my_garden_snapshot() to authenticated;
