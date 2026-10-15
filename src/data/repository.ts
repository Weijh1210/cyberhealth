import {DATA_KEY, initialData, migrateData} from '../lib/store';
import type {AppData} from '../lib/types';

// Synchronous adapter preserves the existing guest storage key and migration path.
// A future account repository can replace this boundary without changing domain rules.
export interface Repository {
 read(): AppData;
 save(data: AppData): boolean;
 clear(): boolean;
 export(data: AppData): string;
 selectAccount(userId:string|null):void;
 currentKey():string;
 readGuest():AppData;
 subscribe(listener: (data: AppData) => void): () => void;
}
let storageKey=DATA_KEY;
let volatileData:AppData|null=null;
let volatileOnly=false;
export const localRepository: Repository = {
 read(){
  if(volatileOnly&&volatileData)return volatileData;
  try {const raw=localStorage.getItem(storageKey);return volatileData=raw?migrateData(JSON.parse(raw)):volatileData||initialData();}
  catch{return volatileData||initialData();}
 },
 save(data){volatileData=data;let saved=true;try{localStorage.setItem(storageKey,JSON.stringify(data));}catch{saved=false;}volatileOnly=!saved;return saved;},
 clear(){let cleared=true;try{localStorage.removeItem(storageKey);}catch{cleared=false;}if(cleared){volatileData=null;volatileOnly=false;}return cleared;},
 selectAccount(userId){const key=userId?`${DATA_KEY}:account:${encodeURIComponent(userId)}`:DATA_KEY;if(key!==storageKey){storageKey=key;volatileData=null;volatileOnly=false;}},
 currentKey:()=>storageKey,
 readGuest(){try{return migrateData(JSON.parse(localStorage.getItem(DATA_KEY)||'null'));}catch{return initialData();}},
 export: data => JSON.stringify({exportedAt:new Date().toISOString(), application:'CyberHealth', data},null,2),
 subscribe(listener) {
  const handler=(event:StorageEvent)=>{
   if(event.key!==storageKey)return;
   try { volatileOnly=false;volatileData=migrateData(JSON.parse(event.newValue||'null'));listener(volatileData); } catch { /* leave valid in-memory data intact */ }
  };
  window.addEventListener('storage',handler);
  return ()=>window.removeEventListener('storage',handler);
 },
};
