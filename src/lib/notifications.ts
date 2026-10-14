export function notificationCapability(env:{secure:boolean;notification:boolean;serviceWorker:boolean;push:boolean;ios:boolean;standalone:boolean;permission:string}) {
 const foreground='站内提醒可用；页面关闭后无法定时提醒。';
 if(!env.secure)return {canRequest:false,message:`请通过 HTTPS 或本机地址打开。${foreground}`};
 if(env.ios&&!env.standalone)return {canRequest:false,message:`iPhone / iPad 请先在 Safari 分享菜单中「添加到主屏幕」，再从主屏幕打开。${foreground}`};
 if(!env.notification)return {canRequest:false,message:`此浏览器不支持系统通知。${foreground}`};
 if(env.permission==='denied')return {canRequest:false,message:`系统通知已被拒绝，可在浏览器网站设置中修改。${foreground}`};
 return {canRequest:true,message:`${env.permission==='granted'?'系统通知权限已允许。':'你可以主动授权系统通知。'}本版本未接入后台推送服务；后台或休眠可能延迟，${foreground}`};
}
export function browserNotificationCapability() {
 return notificationCapability({secure:window.isSecureContext,notification:'Notification'in window,serviceWorker:'serviceWorker'in navigator,push:'PushManager'in window,ios:/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Mac/.test(navigator.userAgent)&&navigator.maxTouchPoints>1),standalone:window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone),permission:typeof Notification==='undefined'?'unsupported':Notification.permission});
}
export async function requestNotifications(){
 const capability=browserNotificationCapability();if(!capability.canRequest)return {granted:false,message:capability.message};
 try {const permission=await Notification.requestPermission();return {granted:permission==='granted',message:browserNotificationCapability().message};}catch{return {granted:false,message:'此设备无法申请系统通知，站内提醒仍可使用。'};}
}
export async function displayNotification() {
 if(typeof Notification==='undefined'||Notification.permission!=='granted')return 'unsupported' as const;
 try {const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.showNotification('给自己一个小间隙？',{body:'确认当前场景，挑一项方便的微活动。',tag:'cyberhealth-break'});else new Notification('给自己一个小间隙？',{body:'挑一项现在做得到的微活动。',tag:'cyberhealth-break'});return 'api-accepted' as const;}catch {return 'failed' as const;}
}
