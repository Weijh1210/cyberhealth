import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import type {GardenContribution,GardenMember,RestInvite} from './types';
export type RemoteGarden={id:string;ownerId?:string;dailyRewardLimit?:number;myTodayRewards?:number;members:GardenMember[];contributions:GardenContribution[];restInvites:RestInvite[]};
let client:SupabaseClient|null=null;
let readyPromise:Promise<SupabaseClient>|null=null;
export const remoteConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function getSupabaseClient(){if(!remoteConfigured)throw new Error('尚未配置 Supabase。');return client??=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);}
async function ready(){return readyPromise??=(async()=>{const supabase=getSupabaseClient();let {data}=await supabase.auth.getSession();if(!data.session){const result=await supabase.auth.signInAnonymously();if(result.error)throw result.error;data={session:result.data.session};}if(!data.session)throw new Error('匿名身份初始化失败。请检查 Supabase Auth 设置。');return supabase;})().catch(e=>{readyPromise=null;throw e;});}
export async function permanentClient(expectedId?:string){
 const shared=getSupabaseClient();const {data:{session}}=await shared.auth.getSession();if(!session)throw new Error('请先登录正式账号。');
 const {data,error}=await shared.auth.getUser(session.access_token);if(error||!data.user||data.user.is_anonymous||(expectedId&&data.user.id!==expectedId))throw new Error('登录身份已变化，请重新操作。');
 // Bind this request to the verified token, even if another tab switches accounts during await.
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${session.access_token}`}}});
}
async function rpc<T>(name:string,args:Record<string,unknown>={},expectedId?:string){const supabase=process.env.NEXT_PUBLIC_P1_CLOUD_ENABLED==='true'?await permanentClient(expectedId):await ready();const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data as T;}
export async function remoteExistingUserId(){const supabase=getSupabaseClient();const {data}=await supabase.auth.getSession();return data.session?.user.id||null;}
export async function remoteUserId(){const supabase=await ready();const {data}=await supabase.auth.getUser();if(!data.user)throw new Error('无法读取当前匿名身份。');return data.user.id;}
export async function loadRemoteGarden(expectedId?:string){return rpc<RemoteGarden|null>('my_garden_snapshot',{},expectedId);}
export async function createRemoteGarden(nickname:string,expectedId?:string){return rpc<string>('create_garden',{p_nickname:nickname},expectedId);}
export async function createRemoteInvite(expectedId?:string){return rpc<string>('create_garden_invite',{},expectedId);}
export async function acceptRemoteInvite(token:string,nickname:string,expectedId?:string){return rpc<string>('accept_garden_invite',{p_token:token,p_nickname:nickname},expectedId);}
export async function leaveRemoteGarden(expectedId?:string){return rpc<boolean>('leave_garden',{},expectedId);}
export async function contributeRemote(sessionId:string,activityId:string,restInviteId?:string,expectedId?:string){return rpc<{awarded:boolean;total:number;reason?:'duplicate'|'daily-limit'}>('complete_garden_activity',{p_session_id:sessionId,p_activity_id:activityId,p_rest_invite_id:restInviteId||null},expectedId);}
export async function beginRemoteRestInvite(id:string,expectedId?:string){return rpc<string>('begin_rest_invite',{p_invite_id:id},expectedId);}
export async function sendRemoteRestInvite(expectedId?:string){return rpc<string>('send_rest_invite',{},expectedId);}
export async function respondRemoteRestInvite(id:string,response:'now'|'later'|'ignored',expectedId?:string){return rpc<string>('respond_rest_invite',{p_invite_id:id,p_response:response},expectedId);}
