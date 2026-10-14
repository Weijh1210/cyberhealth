import {clearData, DATA_KEY, migrateData, readData, saveData} from '../lib/store';
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
export const localRepository: Repository = {
 read: readData, save: saveData, clear: clearData,
 export: data => JSON.stringify({exportedAt:new Date().toISOString(), application:'CyberHealth', data},null,2),
 subscribe(listener) {
  const handler=(event:StorageEvent)=>{
   if(event.key!==DATA_KEY)return;
   try { listener(migrateData(JSON.parse(event.newValue||'null'))); } catch { /* leave valid in-memory data intact */ }
  };
  window.addEventListener('storage',handler);
  return ()=>window.removeEventListener('storage',handler);
 },
};
