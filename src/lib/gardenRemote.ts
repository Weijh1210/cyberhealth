import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import type {GardenContribution,GardenMember,RestInvite} from './types';
export type RemoteGarden={id:string;ownerId?:string;dailyRewardLimit?:number;myTodayRewards?:number;members:GardenMember[];contributions:GardenContribution[];restInvites:RestInvite[]};
let client:SupabaseClient|null=null;
let readyPromise:Promise<SupabaseClient>|null=null;
export const remoteConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function getSupabaseClient(){if(!remoteConfigured)throw new Error('尚未配置 Supabase。');return client??=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);}
async function ready(){return readyPromise??=(async()=>{const supabase=getSupabaseClient();let {data}=await supabase.auth.getSession();if(!data.session){const result=await supabase.auth.signInAnonymously();if(result.error)throw result.error;data={session:result.data.session};}if(!data.session)throw new Error('匿名身份初始化失败。请检查 Supabase Auth 设置。');return supabase;})().catch(e=>{readyPromise=null;throw e;});}
async function rpc<T>(name:string,args:Record<string,unknown>={}){const supabase=await ready();const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data as T;}
export async function remoteExistingUserId(){const supabase=getSupabaseClient();const {data}=await supabase.auth.getSession();return data.session?.user.id||null;}
export async function remoteUserId(){const supabase=await ready();const {data}=await supabase.auth.getUser();if(!data.user)throw new Error('无法读取当前匿名身份。');return data.user.id;}
export async function loadRemoteGarden(){return rpc<RemoteGarden|null>('my_garden_snapshot');}
export async function createRemoteGarden(nickname:string){return rpc<string>('create_garden',{p_nickname:nickname});}
export async function createRemoteInvite(){return rpc<string>('create_garden_invite');}
export async function acceptRemoteInvite(token:string,nickname:string){return rpc<string>('accept_garden_invite',{p_token:token,p_nickname:nickname});}
export async function leaveRemoteGarden(){return rpc<boolean>('leave_garden');}
export async function contributeRemote(sessionId:string,activityId:string,restInviteId?:string){return rpc<{awarded:boolean;total:number;reason?:'duplicate'|'daily-limit'}>('complete_garden_activity',{p_session_id:sessionId,p_activity_id:activityId,p_rest_invite_id:restInviteId||null});}
export async function beginRemoteRestInvite(id:string){return rpc<string>('begin_rest_invite',{p_invite_id:id});}
export async function sendRemoteRestInvite(){return rpc<string>('send_rest_invite');}
export async function respondRemoteRestInvite(id:string,response:'now'|'later'|'ignored'){return rpc<string>('respond_rest_invite',{p_invite_id:id,p_response:response});}
