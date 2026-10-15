import {getSupabaseClient,remoteConfigured} from './gardenRemote';
export const cloudConfigured=remoteConfigured&&process.env.NEXT_PUBLIC_P1_CLOUD_ENABLED==='true';
export type Account={id:string;email:string};
export async function verifiedAccount():Promise<Account|null>{if(!cloudConfigured)return null;const {data,error}=await getSupabaseClient().auth.getUser();if(error){const {data:session}=await getSupabaseClient().auth.getSession();if(!session.session)return null;throw error;}return data.user&&!data.user.is_anonymous?{id:data.user.id,email:data.user.email||''}:null;}
export async function requestEmailCode(email:string){if(!cloudConfigured)throw new Error('账号服务尚未配置，游客功能可正常使用。');const auth=getSupabaseClient().auth;const {data}=await auth.getSession();
 // Preserve existing anonymous garden identity by linking its email, never silently discard it.
 const result=data.session?.user.is_anonymous?await auth.updateUser({email}):await auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(result.error)throw result.error;return data.session?.user.is_anonymous?'email_change' as const:'email' as const;
}
export async function verifyEmailCode(email:string,token:string,type:'email'|'email_change'){const {error}=await getSupabaseClient().auth.verifyOtp({email,token,type});if(error)throw error;}
export async function signOutAccount(){if(!cloudConfigured)return;const {error}=await getSupabaseClient().auth.signOut({scope:'local'});if(error)throw error;}
