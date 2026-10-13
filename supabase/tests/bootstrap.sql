-- Only for an isolated disposable Postgres test database, never apply to Supabase.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-cccc-cccc-cccccccccccc');
grant usage on schema public,auth to authenticated;
