import type {GardenContribution,LocalGarden,RestInvite} from './types';
const id=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
export const GARDEN_INVITE_MS=7*24*60*60*1000;
export const REST_INVITE_MS=10*60*1000;
export function gardenStage(count:number){return count>=10?'花开一庭':count>=5?'枝叶舒展':count>=2?'新芽长出':'一粒种子';}
export function createLocalGarden(nickname:string,now=Date.now()):LocalGarden{return {id:id(),createdAt:new Date(now).toISOString(),members:[{id:'self',nickname:nickname.trim()||'我',joinedAt:new Date(now).toISOString()}],invite:null,restInvites:[],contributions:[],actorId:'self'};}
export function createLocalInvite(g:LocalGarden,now=Date.now()):LocalGarden{if(g.members.length>=2)return g;return {...g,invite:{token:id(),createdAt:new Date(now).toISOString(),expiresAt:new Date(now+GARDEN_INVITE_MS).toISOString(),status:'pending'}};}
export function acceptLocalInvite(g:LocalGarden,token:string,nickname:string,now=Date.now()):LocalGarden{
 if(!g.invite||g.invite.token!==token||g.invite.status!=='pending'||new Date(g.invite.expiresAt).getTime()<=now||g.members.length>=2)return g;
 return {...g,members:[...g.members,{id:'friend',nickname:nickname.trim()||'演示好友',joinedAt:new Date(now).toISOString()}],invite:{...g.invite,status:'accepted',acceptedBy:'friend'},actorId:'friend'};
}
export function leaveLocalGarden(g:LocalGarden):LocalGarden|null{const actor=g.actorId;const members=g.members.filter(m=>m.id!==actor);return members.length?{...g,members,actorId:members[0].id as 'self'|'friend',invite:null,contributions:g.contributions.filter(c=>c.memberId!==actor),restInvites:g.restInvites.filter(r=>r.senderId!==actor&&r.recipientId!==actor)}:null;}
export function sendLocalRestInvite(g:LocalGarden,now=Date.now()):LocalGarden{if(g.members.length!==2)return g;const recipient=g.members.find(m=>m.id!==g.actorId)!;return {...g,restInvites:[...g.restInvites,{id:id(),senderId:g.actorId,recipientId:recipient.id,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+REST_INVITE_MS).toISOString(),status:'pending'}]};}
export function displayRestStatus(invite:RestInvite,now=Date.now()):RestInvite['status']{return invite.status==='pending'&&new Date(invite.expiresAt).getTime()<=now?'expired':invite.status==='now'&&!invite.participationStartedAt&&new Date(invite.expiresAt).getTime()<=now?'expired':invite.status;}
export function respondLocalRestInvite(g:LocalGarden,inviteId:string,response:'now'|'later'|'ignored',now=Date.now()):LocalGarden{return {...g,restInvites:g.restInvites.map(invite=>invite.id===inviteId&&invite.recipientId===g.actorId&&displayRestStatus(invite,now)==='pending'?{...invite,status:response}:invite)};}
export function beginLocalRestInvite(g:LocalGarden,inviteId:string,now=Date.now()):LocalGarden{return {...g,restInvites:g.restInvites.map(r=>r.id===inviteId&&r.recipientId===g.actorId&&['now','later'].includes(displayRestStatus(r,now))?{...r,participationStartedAt:r.participationStartedAt||new Date(now).toISOString()}:r)};}
export function contributeLocal(g:LocalGarden,sessionId:string,activityId:string,restInviteId?:string,now=Date.now()):LocalGarden{
 if(!g.members.some(m=>m.id===g.actorId)||g.contributions.some(c=>c.memberId===g.actorId&&c.sessionId===sessionId))return g;
 if(restInviteId){const invite=g.restInvites.find(r=>r.id===restInviteId&&r.recipientId===g.actorId);if(!invite?.participationStartedAt||now-new Date(invite.participationStartedAt).getTime()<60000)return g;}
 const contribution:GardenContribution={id:id(),memberId:g.actorId,sessionId,activityId,at:new Date(now).toISOString()};
 return {...g,contributions:[...g.contributions,contribution],restInvites:g.restInvites.map(r=>r.id===restInviteId&&r.recipientId===g.actorId&&['now','later'].includes(displayRestStatus(r,now))?{...r,status:'participated',activitySessionId:sessionId}:r)};
}
