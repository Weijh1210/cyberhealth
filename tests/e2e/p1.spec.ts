import {test,expect,type Page} from '@playwright/test';
const key='moyu-wellness-v1';
const nav=(page:Page,name:string)=>page.getByRole('navigation',{name:test.info().project.name==='mobile'?'手机导航':'主导航'}).getByRole('button',{name,exact:true});
async function start(page:Page){await page.goto('/');await page.getByRole('button',{name:'先跳过',exact:true}).click();}

test('adaptive mode is opt-in, explains sparse data, persists, and resets old weights',async({page})=>{
 await start(page);await nav(page,'我的节奏').click();const block=page.locator('.adaptive-settings');const toggle=block.getByRole('checkbox');await expect(toggle).not.toBeChecked();await toggle.check();await expect(block.getByRole('status')).toContainText('有效反馈不足');await page.reload();await nav(page,'我的节奏').click();await expect(toggle).toBeChecked();
 await page.evaluate(storageKey=>{const d=JSON.parse(localStorage.getItem(storageKey)!);const hour=(new Date().getHours()+1)%24;d.reminder.startHour=0;d.reminder.endHour=0;d.reminder.dndStartHour=0;d.reminder.dndEndHour=0;d.reminderEvents=[];for(let i=0;i<6;i++){const when=new Date();when.setDate(when.getDate()-i-1);when.setHours(hour,0,0,0);const at=when.toISOString();d.reminderEvents.push({id:`due-${i}`,companionId:'test',type:'due',at,scheduledAt:at},{id:`post-${i}`,companionId:'test',type:'postponed',reminderId:`due-${i}`,at,delayMinutes:15});}localStorage.setItem(storageKey,JSON.stringify(d));},key);
 await page.reload();await nav(page,'我的节奏').click();await expect(block.getByRole('status')).toContainText('经常延后');await block.getByRole('button',{name:'恢复默认提醒偏好'}).click();await expect(block.getByRole('status')).toContainText('有效反馈不足');await toggle.uncheck();await expect(block.getByRole('status')).toContainText('已关闭');
});

test('six feedback options work and explicit restoration survives a refresh',async({page})=>{
 await start(page);const title=await page.locator('.result-copy h2').textContent();
 await page.getByRole('region',{name:'当前推荐'}).getByRole('button',{name:'歇一下',exact:true}).click();await page.clock.install();await page.getByRole('button',{name:'开始计时',exact:true}).click();await page.clock.runFor(31000);await page.getByRole('button',{name:'我已完成，确认记录'}).click();
 await page.getByText('给这次活动一点反馈').click();
 const feedback=page.locator('.feedback-box');for(const label of ['喜欢这个动作','太简单','太难','不适合当前场景','不想再推荐','没有特别感觉'])await expect(feedback.getByRole('button',{name:label,exact:true})).toBeVisible();await feedback.getByRole('button',{name:'不想再推荐',exact:true}).click();await nav(page,'我的节奏').click();await expect(page.locator('.blocked-actions')).toContainText(title!);await page.getByRole('button',{name:'重新启用',exact:true}).click();await page.reload();await nav(page,'我的节奏').click();await expect(page.locator('.blocked-actions')).toHaveCount(0);
 const data=await page.evaluate(storageKey=>JSON.parse(localStorage.getItem(storageKey)!),key);expect(data.feedback.at(-1).value).toBe('restored');expect(data.sessions.filter((s:{status:string})=>s.status==='completed')).toHaveLength(1);
});

test('seasonal note and unreviewed traditional preview are optional reading',async({page})=>{
 await page.clock.install({time:new Date('2026-11-11T04:00:00Z')});
 await start(page);await nav(page,'手记').click();await page.getByText(/节气短笺/).click();
 await expect(page.locator('.seasonal-note p')).toBeVisible();
 await nav(page,'歇一下').click();await page.getByRole('button',{name:'其他休息'}).click();await page.getByText('传统导引 · 内容预览').click();
 await page.getByText('八段锦完整练习入口',{exact:false}).click();
 await expect(page.locator('.traditional-preview')).toContainText('完整套路');
 await expect(page.getByRole('button',{name:'开始',exact:true})).toBeVisible();
});

test('three main destinations, honest account status and empty journal',async({page})=>{
 await start(page);const navigation=page.getByRole('navigation',{name:test.info().project.name==='mobile'?'手机导航':'主导航'});
 await expect(navigation.getByRole('button')).toHaveText([/歇一下/,/手记/,/我的节奏/]);
 await nav(page,'我的节奏').click();await expect(page.locator('.account-panel')).toContainText('账号服务尚未配置');
 await nav(page,'手记').click();await expect(page.getByText('还没有完成记录')).toBeVisible();await nav(page,'歇一下').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
