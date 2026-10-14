const DB='cyberhealth-reminder-claims';
function openClaims():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore('claims');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
// IndexedDB read/write transactions serialize across tabs; add fails for an existing occurrence.
// Return false on unsupported/private-storage failures: never fake a successful claim.
export async function claimReminder(id:string):Promise<boolean>{
 try {const db=await openClaims();return await new Promise(resolve=>{const tx=db.transaction('claims','readwrite');const store=tx.objectStore('claims');let claimed=false;const get=store.get(id);get.onsuccess=()=>{if(get.result===undefined){store.add(Date.now(),id);claimed=true;}};tx.oncomplete=()=>{db.close();resolve(claimed);};tx.onerror=tx.onabort=()=>{db.close();resolve(false);};});}catch{return false;}
}
export async function clearReminderClaims(){try {const db=await openClaims();const tx=db.transaction('claims','readwrite');tx.objectStore('claims').clear();tx.oncomplete=()=>db.close();}catch{/* personal repository reports its own storage status */}}
