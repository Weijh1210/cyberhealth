import type {Session} from './types';
export function remainingSeconds(session:Session,now:number){return session.status==='running'&&session.deadlineAt!==null?Math.min(session.remainingSeconds,Math.max(0,Math.ceil((session.deadlineAt-now)/1000))):session.remainingSeconds;}
export function transitionSession(session:Session,action:'start'|'pause'|'tick'|'skip',now:number):Session {
 if(['completed','exited'].includes(session.status))return session;
 const left=remainingSeconds(session,now);
 if(action==='skip')return {...session,status:'exited',remainingSeconds:left,deadlineAt:null};
 if(action==='tick')return session.status==='running'&&left===0?{...session,status:'ready',remainingSeconds:0,deadlineAt:null}:session;
 if(action==='start')return session.status==='paused'?{...session,status:'running',deadlineAt:now+left*1000}:session;
 if(action==='pause')return session.status==='running'?{...session,status:left===0?'ready':'paused',remainingSeconds:left,deadlineAt:null}:session;
 return session;
}
