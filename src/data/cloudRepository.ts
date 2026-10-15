import {getSupabaseClient} from '../lib/gardenRemote';import {verifiedAccount} from '../lib/account';
import {cloudPayload,type CloudPreferences,type CloudSnapshot} from '../lib/cloudMerge';import type {AppData} from '../lib/types';
async function requireAccount(expectedId:string){const account=await verifiedAccount();if(!account||account.id!==expectedId)throw new Error('登录身份已变化，请重新打开同步。');return account;}
export async function downloadCloud(userId:string){await requireAccount(userId);const {data,error}=await getSupabaseClient().rpc('personal_snapshot_v1');if(error)throw error;return data as CloudSnapshot;}
export async function uploadCloud(userId:string,local:AppData,expectedRevision:number,preferences:CloudPreferences|null){await requireAccount(userId);const {data,error}=await getSupabaseClient().rpc('sync_personal_v1',{p_expected_revision:expectedRevision,p_preferences:preferences,p_payload:cloudPayload(local)});if(error)throw error;return data as CloudSnapshot;}
