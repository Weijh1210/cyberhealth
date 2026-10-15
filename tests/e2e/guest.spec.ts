import {test,expect,type Page} from '@playwright/test';
const nav=(page:Page,name:string)=>page.getByRole('navigation',{name:test.info().project.name==='mobile'?'手机导航':'主导航'}).getByRole('button',{name,exact:true});
async function skip(page:Page){await page.goto('/');await page.getByRole('button',{name:'先跳过',exact:true}).click();}
async function seedReminder(page:Page){await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('moyu-wellness-v1')!);d.reminder={...d.reminder,enabled:true,startHour:0,endHour:0,dndStartHour:0,dndEndHour:0};d.companion={id:'e2e-companion',status:'active',startedAt:new Date().toISOString(),currentScene:'library',nextReminderAt:Date.now()-1000};localStorage.setItem('moyu-wellness-v1',JSON.stringify(d));});}

test('guest onboarding → library → activity → confirm → growth → reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');const dialog=page.getByRole('dialog',{name:'简短设置'});
 await dialog.getByRole('button',{name:'下一步',exact:true}).click();await dialog.getByRole('button',{name:'颈肩',exact:true}).click();
 await dialog.getByRole('button',{name:'下一步',exact:true}).click();await expect(dialog.getByRole('button',{name:'图书馆 / 自习室',exact:true})).toHaveAttribute('aria-pressed','true');
 await dialog.getByRole('button',{name:'下一步',exact:true}).click();await expect(dialog.getByLabel('每日最多提醒')).toHaveValue('3');await expect(dialog.getByLabel('最小提醒间隔')).toHaveValue('60');
 await dialog.getByRole('button',{name:'下一步',exact:true}).click();await dialog.getByRole('button',{name:'保存并开始'}).click();
 await expect(page.getByText('提醒已关闭',{exact:true})).toBeVisible();await page.getByRole('button',{name:'现在活动一下',exact:true}).click();
 await page.getByRole('button',{name:'图书馆/自习室',exact:true}).click();await page.getByRole('button',{name:'看看推荐',exact:true}).click();
 await expect(page.locator('.result-copy')).toContainText('适合图书馆');await page.getByRole('button',{name:'开始这项活动'}).click();
 await page.clock.install();await page.getByRole('button',{name:'开始计时',exact:true}).click();await page.clock.runFor(5000);
 await page.getByRole('button',{name:'暂停计时',exact:true}).click();const time=await page.locator('.timer-ring strong').textContent();await page.clock.runFor(10000);await expect(page.locator('.timer-ring strong')).toHaveText(time!);
 await page.getByRole('button',{name:'继续计时',exact:true}).click();await page.clock.runFor(65000);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu-wellness-v1')!));expect(saved.sessions.filter((s:{status:string})=>s.status==='completed')).toHaveLength(0);
 await page.getByRole('button',{name:'我已完成，确认记录',exact:true}).click();await nav(page,'成长').click();await expect(page.locator('.today-growth')).toContainText('1 次');
 await page.reload();await nav(page,'成长').click();await expect(page.locator('.today-growth')).toContainText('1 次');
 const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu-wellness-v1')!));expect(records.sessions.filter((s:{status:string})=>s.status==='completed')).toHaveLength(1);expect(records.profile.focusAreas).toContain('neck');expect(errors).toEqual([]);
});

test('skip onboarding, modify preferences, reject unsuitable action, export and clear',async({page})=>{
 await skip(page);await nav(page,'我的').click();await page.getByRole('button',{name:'修改偏好与时段'}).click();const dialog=page.getByRole('dialog',{name:'简短设置'});
 await dialog.getByRole('button',{name:'眼睛',exact:true}).click();for(let i=0;i<3;i++)await dialog.getByRole('button',{name:'下一步',exact:true}).click();await dialog.getByRole('button',{name:'保存并开始'}).click();
 await page.reload();await nav(page,'我的').click();await expect(page.getByText(/当前关注：.*眼睛/)).toBeVisible();
 await nav(page,'活动').click();await page.getByRole('button',{name:'看看推荐'}).click();const name=await page.locator('.result-copy h3').textContent();await page.getByRole('button',{name:'不适合我',exact:true}).click();await page.getByRole('button',{name:'看看推荐'}).click();await expect(page.locator('.result-copy h3')).not.toHaveText(name!);
 await page.getByRole('button',{name:'户外/公园',exact:true}).click();await expect(page.getByText('当前没有匹配的活动',{exact:true})).toBeVisible();
 await nav(page,'我的').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出个人数据 JSON'}).click();expect((await download).suggestedFilename()).toMatch(/cyberhealth-.*json/);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'清除全部本地数据'}).click();await expect(page.getByRole('dialog',{name:'简短设置'})).toBeVisible();await page.reload();await expect(page.getByRole('dialog',{name:'简短设置'})).toBeVisible();
});

test('foreground reminder records reason and snoozes exactly 15 minutes',async({page})=>{
 await skip(page);await seedReminder(page);await page.reload();const dialog=page.getByRole('dialog',{name:'休息提醒'});await expect(dialog).toBeVisible();
 await dialog.getByLabel('提醒反馈原因').selectOption('正在开会 / 上课');await dialog.getByRole('button',{name:'延后 15 分钟',exact:true}).click();
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu-wellness-v1')!));expect(data.reminderEvents.filter((e:{type:string})=>e.type==='due')).toHaveLength(1);const event=data.reminderEvents.findLast((e:{type:string})=>e.type==='postponed');expect(event.reason).toBe('正在开会 / 上课');expect(data.reminder.snoozedUntil-Date.parse(event.at)).toBe(15*60000);
 await page.clock.install();await page.clock.runFor(15*60000+2000);await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'我已经活动过了'}).click();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu-wellness-v1')!));expect(after.reminderEvents.filter((e:{type:string})=>e.type==='due')).toHaveLength(1);expect(after.sessions).toHaveLength(0);expect(after.reminderEvents.filter((e:{type:string})=>e.type!=='planned').at(-1).type).toBe('already-active');
});

test('atomic occurrence claim prevents duplicate reminders across tabs',async({page,context})=>{
 await skip(page);const other=await context.newPage();await other.goto('/');await expect(other.getByRole('button',{name:'现在活动一下'})).toBeVisible();
 await context.addInitScript(()=>Object.defineProperty(document,'visibilityState',{get:()=> 'visible'}));
 await seedReminder(page);await Promise.all([page.reload(),other.reload()]);await page.bringToFront();await expect.poll(async()=>await page.getByRole('dialog',{name:'休息提醒'}).count()+await other.getByRole('dialog',{name:'休息提醒'}).count()).toBe(1);
 const events=await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu-wellness-v1')!).reminderEvents);expect(events.filter((e:{type:string})=>e.type==='due')).toHaveLength(1);
});

test('PWA shell and records work offline after caching; layout fits viewport',async({page,context})=>{
 await skip(page);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await expect(page.getByRole('button',{name:'现在活动一下'})).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('cyberhealth-shell-v1');return (await cache.keys()).filter(r=>new URL(r.url).pathname.startsWith('/_next/static/')).length;})).toBeGreaterThan(0);
 await context.setOffline(true);await page.reload();await expect(page.getByRole('button',{name:'现在活动一下'})).toBeVisible();await expect(page.getByRole('status')).toContainText('当前离线');await nav(page,'成长').click();await expect(page.getByText('还没有完成记录',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await context.setOffline(false);
});

test('notifications are requested only after a click; denial still allows guest use and keyboard focus',async({page})=>{
 await page.addInitScript(()=>{let requests=0;const mock={permission:'default',requestPermission:async()=>{requests++;mock.permission='denied';return 'denied';}};Object.defineProperty(window,'Notification',{value:mock,configurable:true});Object.defineProperty(window,'notificationRequests',{get:()=>requests});});
 await page.goto('/');const dialog=page.getByRole('dialog',{name:'简短设置'});for(let i=0;i<4;i++)await dialog.getByRole('button',{name:'下一步',exact:true}).click();
 expect(await page.evaluate(()=>(window as unknown as {notificationRequests:number}).notificationRequests)).toBe(0);
 await dialog.getByRole('button',{name:'开启系统通知'}).click();await expect(dialog.getByRole('status')).toContainText('已被拒绝');expect(await page.evaluate(()=>(window as unknown as {notificationRequests:number}).notificationRequests)).toBe(1);
 await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
 await dialog.getByRole('button',{name:'保存并开始'}).click();await expect(page.getByRole('button',{name:'现在活动一下'})).toBeVisible();
 await page.screenshot({path:`test-results/home-${test.info().project.name}.png`,fullPage:true});
});

test('custom pause time persists, resumes when due, and disabling prevents reminders',async({page})=>{
 await skip(page);await page.getByRole('button',{name:'开启休息提醒',exact:true}).click();
 const future=new Date(Date.now()+2*3600000);const input=new Date(future.getTime()-future.getTimezoneOffset()*60000).toISOString().slice(0,16);
 await page.getByLabel('恢复提醒时间').fill(input);await page.getByRole('button',{name:'暂停提醒',exact:true}).click();await expect(page.getByText('提醒已暂停',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('提醒已暂停',{exact:true})).toBeVisible();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('moyu-wellness-v1')!));expect(Date.parse(stored.reminder.pausedUntil)).toBe(Date.parse(input));
 await page.clock.install();const currentTime=await page.evaluate(()=>Date.now());await page.clock.runFor(Date.parse(stored.reminder.pausedUntil)-currentTime+2000);await expect(page.getByText('提醒已开启',{exact:true})).toBeVisible();const reminder=page.getByRole('dialog',{name:'休息提醒'});if(await reminder.isVisible())await reminder.getByRole('button',{name:'跳过本次',exact:true}).click();await page.getByRole('button',{name:'关闭提醒',exact:true}).click();await page.clock.runFor(3*3600000);await expect(page.getByRole('dialog',{name:'休息提醒'})).toHaveCount(0);await expect(page.getByText('提醒已关闭',{exact:true})).toBeVisible();
});
