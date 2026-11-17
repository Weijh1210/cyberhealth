import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from './store';
import {gardenProgress} from './gardenGame';

test('garden starts empty and grows only from recorded rests, using the garden city day',()=>{
 const data=initialData();data.courtyard.city='hongkong';
 assert.equal(gardenProgress(data,'2026-11-17').total,0);
 data.restJournal={notes:[{id:'a',kind:'quiet',title:'静坐',at:'2026-11-16T18:00:00Z'},{id:'b',kind:'look',title:'看远',at:'2026-11-17T02:00:00Z'},{id:'c',kind:'hands',title:'松手',at:'2026-11-15T01:00:00Z'}],seed:false,peel:false,exhibit:[],draws:{},pending:[],disabledLife:[]};
 const progress=gardenProgress(data,'2026-11-17');
 assert.equal(progress.today,2);assert.equal(progress.total,3);assert.equal(progress.chapter,'一隅新绿');assert.equal(progress.remaining,3);
 const saved=JSON.parse(JSON.stringify(data));assert.deepEqual(gardenProgress(saved,'2026-11-17'),progress);
});
