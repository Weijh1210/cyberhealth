import {test,expect,type Page} from '@playwright/test';
const key='moyu-wellness-v1';
const nav=(page:Page,name:string)=>page.getByRole('navigation',{name:test.info().project.name==='mobile'?'手机导航':'主导航'}).getByRole('button',{name,exact:true});
async function start(page:Page){await page.goto('/');await page.getByRole('button',{name:'先跳过',exact:true}).click();}

test('adaptive mode is opt-in, explains sparse data, persists, and resets old weights',async({page})=>{
 await start(page);await nav(page,'我的').click();const block=page.locator('.adaptive-settings');const toggle=block.getByRole('checkbox');await expect(toggle).not.toBeChecked();await toggle.check();await expect(block.getByRole('status')).toContainText('有效反馈不足');await page.reload();await nav(page,'我的').click();await expect(toggle).toBeChecked();
 await page.evaluate(storageKey=>{const d=JSON.parse(localStorage.getItem(storageKey)!);const hour=(new Date().getHours()+1)%24;d.reminder.startHour=0;d.reminder.endHour=0;d.reminder.dndStartHour=0;d.reminder.dndEndHour=0;d.reminderEvents=[];for(let i=0;i<6;i++){const when=new Date();when.setDate(when.getDate()-i-1);when.setHours(hour,0,0,0);const at=when.toISOString();d.reminderEvents.push({id:`due-${i}`,companionId:'test',type:'due',at,scheduledAt:at},{id:`post-${i}`,companionId:'test',type:'postponed',reminderId:`due-${i}`,at,delayMinutes:15});}localStorage.setItem(storageKey,JSON.stringify(d));},key);
 await page.reload();await nav(page,'我的').click();await expect(block.getByRole('status')).toContainText('经常延后');await block.getByRole('button',{name:'恢复默认提醒偏好'}).click();await expect(block.getByRole('status')).toContainText('有效反馈不足');await toggle.uncheck();await expect(block.getByRole('status')).toContainText('已关闭');
});

test('six feedback options work and explicit restoration survives a refresh',async({page})=>{
 await start(page);await page.getByRole('button',{name:'现在活动一下',exact:true}).click();await page.getByRole('button',{name:'30 秒',exact:true}).click();await page.getByRole('button',{name:'看看推荐',exact:true}).click();const title=await page.locator('.result-copy h3').textContent();
 await page.getByRole('button',{name:'开始这项活动'}).click();await page.clock.install();await page.getByRole('button',{name:'开始计时',exact:true}).click();await page.clock.runFor(31000);await page.getByRole('button',{name:'我已完成，确认记录'}).click();
 const feedback=page.locator('.feedback-box');for(const label of ['喜欢这个动作','太简单','太难','不适合当前场景','不想再推荐','没有特别感觉'])await expect(feedback.getByRole('button',{name:label,exact:true})).toBeVisible();await feedback.getByRole('button',{name:'不想再推荐',exact:true}).click();await nav(page,'我的').click();await expect(page.locator('.blocked-actions')).toContainText(title!);await page.getByRole('button',{name:'重新启用',exact:true}).click();await page.reload();await nav(page,'我的').click();await expect(page.locator('.blocked-actions')).toHaveCount(0);
 const data=await page.evaluate(storageKey=>JSON.parse(localStorage.getItem(storageKey)!),key);expect(data.feedback.at(-1).value).toBe('restored');expect(data.sessions.filter((s:{status:string})=>s.status==='completed')).toHaveLength(1);
});

test('daily cultural card is stable, bilingual, and never prevents taking a break',async({page})=>{
 await start(page);await page.getByRole('button',{name:'抽取今日元气签',exact:true}).click();const blessing=await page.locator('.fortune-card strong').textContent();await page.getByRole('button',{name:'切换文化语言'}).click();await expect(page.locator('.fortune-card')).toContainText('without predictions');await page.reload();await page.getByRole('button',{name:'View today’s card',exact:true}).click();await page.getByRole('button',{name:'切换文化语言'}).click();await expect(page.locator('.fortune-card strong')).toHaveText(blessing!);await nav(page,'活动').click();await expect(page.getByRole('heading',{name:'适合此刻的小动作'})).toBeVisible();
});

test('five-page navigation, honest unconfigured account and garden status, real empty growth',async({page})=>{
 await start(page);const navigation=page.getByRole('navigation',{name:test.info().project.name==='mobile'?'手机导航':'主导航'});await expect(navigation.getByRole('button')).toHaveCount(5);await nav(page,'花园').click();await expect(page.getByText('本地演示模式',{exact:true})).toBeVisible();await nav(page,'我的').click();await expect(page.locator('.account-panel')).toContainText('账号服务尚未配置');await nav(page,'成长').click();await expect(page.getByText('还没有有效提醒反馈，不展示推测比例。')).toBeVisible();await expect(page.locator('.trend-grid')).toContainText('0 次');await nav(page,'首页').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/p1-home-${test.info().project.name}.png`,fullPage:true});await nav(page,'我的').click();await page.screenshot({path:`test-results/p1-profile-${test.info().project.name}.png`,fullPage:true});
});
