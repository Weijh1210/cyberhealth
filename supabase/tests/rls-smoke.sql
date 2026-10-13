\set ON_ERROR_STOP on
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select public.create_garden('甲') as garden_id \gset
select public.create_garden_invite() as invite_token \gset
select public.complete_garden_activity('session-0001','window-pause') as first_contribution;
select public.complete_garden_activity('session-0001','window-pause') as duplicate_contribution;
do $$ begin
 if (select count(*) from public.garden_contributions)<>1 then raise exception 'duplicate contribution'; end if;
 begin
  execute 'select session_id,activity_id,created_at from public.garden_contributions';
  raise exception 'member read private contribution details';
 exception when insufficient_privilege then null;
 end;
end $$;
set request.jwt.claim.sub='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select public.accept_garden_invite(:'invite_token','乙');
do $$ begin
 if (select count(*) from public.garden_members)<>2 then raise exception 'invite acceptance failed'; end if;
end $$;
set request.jwt.claim.sub='cccccccc-cccc-cccc-cccc-cccccccccccc';
do $$ begin
 if (select count(*) from public.gardens)<>0 then raise exception 'nonmember can read garden'; end if;
 if (select count(*) from public.garden_members)<>0 then raise exception 'nonmember can read members'; end if;
 if (select count(*) from public.garden_contributions)<>0 then raise exception 'nonmember can read contributions'; end if;
 if (select count(*) from public.rest_invites)<>0 then raise exception 'nonmember can read rest invites'; end if;
 begin
  execute 'select count(*) from public.garden_invites';
  raise exception 'nonmember can read invite tokens';
 exception when insufficient_privilege then null;
 end;
end $$;
-- Nonmember RPC cannot act on another garden.
do $$ begin
 begin
  perform public.send_rest_invite();
  raise exception 'nonmember sent a rest invite';
 exception when raise_exception then
  if sqlerrm='nonmember sent a rest invite' then raise; end if;
 end;
end $$;
set request.jwt.claim.sub='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select public.send_rest_invite() as rest_id \gset
set request.jwt.claim.sub='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select public.respond_rest_invite(:'rest_id'::uuid,'later');
select public.begin_rest_invite(:'rest_id'::uuid);
do $$ declare v_rest_id uuid; begin
 select id into v_rest_id from public.rest_invites limit 1;
 begin
  perform public.complete_garden_activity('session-0002','window-pause',v_rest_id);
  raise exception '60-second rest completed too early';
 exception when raise_exception then
  if sqlerrm='60-second rest completed too early' then raise; end if;
 end;
 if (select count(*) from public.garden_contributions)<>1 then raise exception 'early completion created contribution'; end if;
end $$;
-- Move the server-recorded start back in this disposable test database.
reset role;
update public.rest_invites set participation_started_at=now()-interval '61 seconds' where id=:'rest_id'::uuid;
set role authenticated;
set request.jwt.claim.sub='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select public.complete_garden_activity('session-0002','window-pause',:'rest_id'::uuid);
do $$ begin
 if (select count(*) from public.rest_invites where status='participated')<>1 then raise exception 'later invitation did not finish'; end if;
end $$;
select public.leave_garden();
do $$ begin
 if (select count(*) from public.gardens)<>0 then raise exception 'former member can still read garden'; end if;
end $$;
