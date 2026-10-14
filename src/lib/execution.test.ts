import test from 'node:test';
import assert from 'node:assert/strict';
import {remainingSeconds,transitionSession} from './execution';
import {initialData,grantCompletion} from './store';
import type {Session} from './types';
test('start pause resume tick and explicit completion are separate',()=>{
 const data=initialData();let session:Session={id:'flow',activityId:'chin-tuck',preference:data.preference,startedAt:new Date(0).toISOString(),status:'paused',deadlineAt:null,remainingSeconds:30};
 session=transitionSession(session,'start',0);assert.equal(remainingSeconds(session,5000),25);
 session=transitionSession(session,'pause',5000);assert.equal(session.status,'paused');assert.equal(remainingSeconds(session,60000),25);
 assert.equal(grantCompletion({...data,sessions:[session]},session.id,new Date(60000)).energy,0);
 session=transitionSession(session,'start',60000);session=transitionSession(session,'tick',85000);assert.equal(session.status,'ready');assert.equal(data.energy,0);
 const completed=grantCompletion({...data,sessions:[session]},session.id,new Date(85000));assert.equal(completed.energy,10);assert.equal(grantCompletion(completed,session.id,new Date(85001)),completed);
});
test('skip cannot become completed or restart; timer alone grants no reward',()=>{
 const data=initialData();const session:Session={id:'skip',activityId:'window-pause',preference:data.preference,startedAt:new Date(0).toISOString(),status:'running',deadlineAt:30000,remainingSeconds:30};
 const exited=transitionSession(session,'skip',5000);assert.equal(exited.remainingSeconds,25);assert.equal(transitionSession(exited,'start',5000),exited);assert.equal(grantCompletion({...data,sessions:[exited]},exited.id,new Date()).energy,0);
 assert.equal(grantCompletion({...data,sessions:[session]},session.id,new Date()).energy,0);
});
