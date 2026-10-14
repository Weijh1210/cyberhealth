import {clearData, DATA_KEY, initialData, migrateData, saveData} from '../lib/store';
import type {AppData} from '../lib/types';

// Synchronous adapter preserves the existing guest storage key and migration path.
// A future account repository can replace this boundary without changing domain rules.
export interface Repository {
 read(): AppData;
 save(data: AppData): boolean;
 clear(): boolean;
 export(data: AppData): string;
 subscribe(listener: (data: AppData) => void): () => void;
}
let volatileData:AppData|null=null;
let volatileOnly=false;
export const localRepository: Repository = {
 read(){
  if(volatileOnly&&volatileData)return volatileData;
  try {const raw=localStorage.getItem(DATA_KEY);return volatileData=raw?migrateData(JSON.parse(raw)):volatileData||initialData();}
  catch{return volatileData||initialData();}
 },
 save(data){volatileData=data;const saved=saveData(data);volatileOnly=!saved;return saved;},
 clear(){const cleared=clearData();if(cleared){volatileData=null;volatileOnly=false;}return cleared;},
 export: data => JSON.stringify({exportedAt:new Date().toISOString(), application:'CyberHealth', data},null,2),
 subscribe(listener) {
  const handler=(event:StorageEvent)=>{
   if(event.key!==DATA_KEY)return;
   try { volatileOnly=false;volatileData=migrateData(JSON.parse(event.newValue||'null'));listener(volatileData); } catch { /* leave valid in-memory data intact */ }
  };
  window.addEventListener('storage',handler);
  return ()=>window.removeEventListener('storage',handler);
 },
};
