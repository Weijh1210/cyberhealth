import {useEffect,useState} from 'react';import {cloudConfigured,verifiedAccount,type Account} from '../lib/account';import {getSupabaseClient} from '../lib/gardenRemote';import {localRepository} from '../data/repository';
export function useAccount(){const [user,setUser]=useState<Account|null>(null),[loading,setLoading]=useState(cloudConfigured),[error,setError]=useState('');
 useEffect(()=>{if(!cloudConfigured){localRepository.selectAccount(null);return;}let alive=true;let version=0;
 const refresh=async()=>{const generation=++version;try{const account=await verifiedAccount();if(!alive||generation!==version)return;localRepository.selectAccount(account?.id||null);setUser(account);setError('');}catch(e){if(!alive||generation!==version)return;localRepository.selectAccount(null);setUser(null);setError(e instanceof Error?e.message:'无法核对登录身份，已返回游客。');}finally{if(alive&&generation===version)setLoading(false);}};
 void refresh();const {data}=getSupabaseClient().auth.onAuthStateChange(()=>{setLoading(true);setTimeout(()=>void refresh(),0);});return()=>{alive=false;version++;data.subscription.unsubscribe();};
 },[]);return {user,loading,error};}
