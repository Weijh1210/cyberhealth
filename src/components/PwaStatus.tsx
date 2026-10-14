'use client';
import {useEffect,useState} from 'react';
export default function PwaStatus(){const [message,setMessage]=useState('');useEffect(()=>{
 if(!('serviceWorker'in navigator)||!window.isSecureContext){setMessage('当前环境无法启用离线缓存，请通过 HTTPS 或本机地址打开。');return;}
 // Production assets have stable hashes; development HMR assets must not be cached.
 if(process.env.NODE_ENV!=='production')return;
 navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>setMessage('离线缓存暂不可用，联网使用与本地记录不受影响。'));
 const changed=()=>setMessage(navigator.onLine?'':'当前离线：已缓存页面和本地活动记录可用，好友同步需联网。');
 changed();window.addEventListener('online',changed);window.addEventListener('offline',changed);return()=>{window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};
 },[]);return message?<div className="offline-status" role="status">{message}</div>:null;}
