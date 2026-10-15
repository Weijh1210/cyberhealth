import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const A='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
async function identity(db:PGlite,id:string,anonymous=false){await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); select set_config('request.jwt.claims','{"is_anonymous":${anonymous}}',false);set role authenticated;`);}
async function setupPersonal(){const db=new PGlite();await db.exec(await readFile('supabase/tests/bootstrap.sql','utf8'));await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant execute on function auth.jwt() to authenticated;`);await db.exec(await readFile('supabase/migrations/002_personal_sync.sql','utf8'));return db;}
test('personal SQL: owner RLS, no direct writes, immutable imports, revision conflicts and anonymous rejection',async()=>{const db=await setupPersonal();try{
 await identity(db,A);const payload={sessions:[{id:'event-original',activityId:'chin-tuck',status:'completed',startedAt:'2026-10-15T00:00:00Z',completedAt:'2026-10-15T00:01:00Z'}]};const prefs={profile:{quiet:true},reminder:{intervalMinutes:60}};
 await db.query('select public.sync_personal_v1($1,$2,$3)',[0,prefs,payload]);await db.query('select public.sync_personal_v1($1,$2,$3)',[0,null,payload]);const first=await db.query<{snapshot:{sessions:unknown[];revision:number}}>('select public.personal_snapshot_v1() as snapshot');assert.equal(first.rows[0].snapshot.sessions.length,1);assert.equal(first.rows[0].snapshot.revision,1);
 await assert.rejects(db.query('select public.sync_personal_v1($1,$2,$3)',[0,prefs,{}]),/Preference conflict/);
 await assert.rejects(db.exec(`insert into public.personal_settings(user_id) values('${B}')`),/permission denied/);
 await identity(db,B);assert.equal((await db.query('select * from public.personal_events')).rows.length,0);const second=await db.query<{snapshot:{sessions:unknown[]}}>('select public.personal_snapshot_v1() as snapshot');assert.equal(second.rows[0].snapshot.sessions.length,0);
 await identity(db,A,true);await assert.rejects(db.exec('select public.personal_snapshot_v1()'),/Permanent account/);
 }finally{await db.close();}});
