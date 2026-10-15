import {permanentClient} from '../lib/gardenRemote';
import {cloudPayload,normalizeCloudSnapshot,type CloudPreferences} from '../lib/cloudMerge';import type {AppData} from '../lib/types';
export async function downloadCloud(userId:string){const client=await permanentClient(userId);const {data,error}=await client.rpc('personal_snapshot_v1');if(error)throw error;return normalizeCloudSnapshot(data);}
export async function uploadCloud(userId:string,local:AppData,expectedRevision:number,preferences:CloudPreferences|null){const client=await permanentClient(userId);const {data,error}=await client.rpc('sync_personal_v1',{p_expected_revision:expectedRevision,p_preferences:preferences,p_payload:cloudPayload(local)});if(error)throw error;return normalizeCloudSnapshot(data);}
