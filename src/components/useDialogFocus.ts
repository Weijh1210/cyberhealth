import {useEffect,useRef} from 'react';
export function useDialogFocus(active:boolean,selector:string,onEscape:()=>void){
 const escapeRef=useRef(onEscape);escapeRef.current=onEscape;
 useEffect(()=>{if(!active)return;const dialog=document.querySelector<HTMLElement>(selector);if(!dialog)return;const previous=document.activeElement as HTMLElement|null;
 const focusables=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(el=>el.offsetParent!==null);
 focusables()[0]?.focus();
 const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();escapeRef.current();return;}if(event.key!=='Tab')return;const items=focusables();const first=items[0],last=items.at(-1);if(!first){event.preventDefault();return;}if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
 dialog.addEventListener('keydown',key);return()=>{dialog.removeEventListener('keydown',key);previous?.focus();};
 },[active,selector]);
}
