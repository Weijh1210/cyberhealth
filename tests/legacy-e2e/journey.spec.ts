import {test,expect,type Page} from '@playwright/test';
import {initialData} from '../../src/lib/store';
import type {AppData} from '../../src/lib/types';

const key='moyu-wellness-v1';
const nav=(page:Page,name:string)=>page.getByRole('navigation',{name:test.info().project.name==='mobile'?'手机导航':'主导航'}).getByRole('button',{name,exact:true});
const stored=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!) as AppData,key);
const start=(page:Page)=>page.getByRole('region',{name:'当前推荐'}).getByRole('button',{name:'歇一下',exact:true});
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const pin=(page:Page,name:string)=>page.locator('.yard-scene').getByRole('button',{name,exact:true});
const photo=(page:Page,name:string)=>page.screenshot({path:`test-results/yard-${name}-${test.info().project.name}.png`,fullPage:true});

async function complete(page:Page){
 await button(page,'开始计时').click();
 await page.clock.runFor(31000);
 await expect(page.getByText('计时结束，等你确认')).toBeVisible();
 const before=(await stored(page)).courtyard.seeds;
 await button(page,'我已完成，确认记录').evaluate((element:HTMLButtonElement)=>{element.click();element.click();});
 await expect(page.getByRole('heading',{name:'紫苏苗已入篓'})).toBeVisible();
 expect((await stored(page)).courtyard.seeds).toBe(before+1);
}

test('courtyard loop with changing weather, two beds, water routes and specimen exhibit',async({page})=>{
 let code=61;
 await page.clock.install({time:new Date('2026-11-11T04:00:00Z')});
 await page.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{current:{time:'2026-11-11T12:00',weather_code:code}}}));
 await page.goto('/');
 await expect(page.getByText('立冬 · 雨')).toBeVisible();
 await expect(page.getByText('2026-11-11 12:00')).toBeVisible();
 await expect(page.locator('.yard-scene')).toHaveAttribute('data-mode','3d');
 await photo(page,'arrival');
 await pin(page,'竹签筒').click();
 await button(page,'从竹筒抽一支').click();
 await expect(page.getByText('签背朝上')).toBeVisible();
 await button(page,'翻签看文').click();
 await expect(page.locator('.yard-slip')).toContainText('借雨');
 await start(page).click();
 await photo(page,'lesson');
 await complete(page);
 await button(page,'回院种紫苏').click();
 if(test.info().project.name==='desktop')await pin(page,'药篓 · 1 苗').dragTo(pin(page,'窗边'));
 else{
  await pin(page,'药篓 · 1 苗').tap();
  await expect(pin(page,'窗边')).toHaveClass(/available/);
  await pin(page,'窗边').tap();
 }
 await expect(pin(page,'窗边 · 紫苏')).toBeVisible();
 await photo(page,'plant');
 await pin(page,'扳竹槽').click();
 await button(page,'引向陶缸').click();
 await expect(pin(page,'陶缸 · 1/4')).toBeVisible();
 await button(page,'引向药圃').click();
 await expect(page.getByText(/湿土 窗边/)).toBeVisible();
 await photo(page,'water');
 code=0;
 await page.reload();
 await expect(page.getByText('立冬 · 晴')).toBeVisible();
 await expect(pin(page,'窗边 · 紫苏')).toBeVisible();
 await expect(pin(page,'陶缸 · 1/4')).toBeVisible();
 await pin(page,'竹签筒').click();
 await expect(page.locator('.yard-slip')).toContainText('借雨');
 await button(page,'用存雨试水路').click();
 await expect(button(page,'引向药圃')).toHaveAttribute('aria-pressed','true');
 await start(page).click();
 await complete(page);
 await button(page,'回院种紫苏').click();
 await pin(page,'药篓 · 1 苗').click();
 await pin(page,'水渠旁').click();
 await pin(page,'水渠旁 · 紫苏').click();
 await button(page,'宽叶').click();
 await button(page,'翻看叶片').click();
 await expect(page.getByRole('img',{name:'紫苏宽叶背面'})).toBeVisible();
 await button(page,'制成紫苏标本页').click();
 await button(page,'陈皮匣').click();
 await button(page,'转动陈皮').click();
 await button(page,'收存陈皮标本').click();
 await nav(page,'手记').click();
 await button(page,'紫苏宽叶标本').click();
 await button(page,'君 · 紫苏叶').click();
 await button(page,'陈皮标本').click();
 await button(page,'佐 · 陈皮').click();
 await expect(page.getByText(/展陈已解锁/)).toBeVisible();
 await photo(page,'journal');
 await nav(page,'我的节奏').click();
 await photo(page,'rhythm');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('legacy history, foreground reminders and canvas failure still allow the complete loop',async({page})=>{
 const today=new Date('2026-11-11T04:00:00Z');
 const original=initialData();
 const {courtyard,...legacy}=original;
 expect(courtyard.seeds).toBe(0);
 const legacyPayload={...legacy,sessions:[{id:'legacy',activityId:'chin-tuck',status:'completed',preference:legacy.preference,
  startedAt:'2026-11-10T04:00:00Z',completedAt:'2026-11-10T04:01:00Z',deadlineAt:null,remainingSeconds:0}],
  reminder:{...legacy.reminder,enabled:true,startHour:0,endHour:0,dndStartHour:0,dndEndHour:0,timezone:'Asia/Shanghai'},
  companion:{id:'yard-reminder',status:'active',startedAt:today.toISOString(),currentScene:'office',nextReminderAt:today.getTime()-1000}};
 await page.clock.install({time:today});
 await page.route('https://api.open-meteo.com/**',route=>route.abort());
 await page.addInitScript(({key,legacyPayload})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(legacyPayload));HTMLCanvasElement.prototype.getContext=()=>null;},{key,legacyPayload});
 await page.goto('/');
 await expect(page.locator('.yard-scene')).toHaveAttribute('data-mode','static');
 const reminder=page.getByRole('dialog',{name:'休息提醒'});
 await reminder.getByRole('button',{name:'现在活动'}).click();
 await complete(page);
 expect((await stored(page)).sessions.at(-1)?.source).toBe('reminder');
 await button(page,'回院种紫苏').click();
 await pin(page,'药篓 · 1 苗').click();
 await pin(page,'水渠旁').click();
 await pin(page,'扳竹槽').click();
 await button(page,'引向药圃').click();
 await page.reload();
 await expect(pin(page,'水渠旁 · 紫苏')).toBeVisible();
 await expect(page.getByText(/天气暂不可用/)).toBeVisible();
 await nav(page,'手记').click();
 await expect(page.locator('.history-list>div')).toHaveCount(2);
 await expect(page.getByText(/水渠旁 · 紫苏 · 土壤已润/)).toBeVisible();
});

test('an empty posture and space combination stays empty until edited',async({page})=>{
 await page.goto('/');
 await button(page,'调整条件').click();
 await page.getByRole('button',{name:/午后离座/}).click();
 await page.getByRole('combobox',{name:'活动空间',exact:true}).selectOption('seat');
 await expect(page.getByText('当前没有匹配的活动')).toBeVisible();
 await expect(start(page)).toHaveCount(0);
 await page.getByRole('combobox',{name:'活动空间',exact:true}).selectOption('spacious');
 await page.getByLabel('现场有可扶的墙面').check();
 await expect(page.locator('.result-copy h2')).toHaveText('小步侧向走');
 page.once('dialog',dialog=>dialog.dismiss());
 await start(page).click();
 expect((await stored(page)).sessions).toHaveLength(0);
 page.once('dialog',dialog=>dialog.accept());
 await start(page).click();
 await expect(page.getByRole('heading',{name:'小步侧向走'})).toBeVisible();
});

test('life reminders merge with a due break and quick records remain optional',async({page})=>{
 const now=new Date('2026-11-11T07:00:00Z');
 const data=initialData();
 data.reminder={...data.reminder,enabled:true,startHour:0,endHour:0,dndStartHour:0,dndEndHour:0,timezone:'Asia/Shanghai'};
 data.companion={id:'merged',status:'active',startedAt:now.toISOString(),currentScene:'office',nextReminderAt:now.getTime()-1000};
 data.courtyard.reminders=[{id:'drink',label:'喝水',time:'15:00'},{id:'headphones',label:'摘耳机',time:'15:00'}];
 await page.clock.install({time:now});
 await page.addInitScript(({key,data})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(data));},{key,data});
 await page.goto('/');
 const reminder=page.getByRole('dialog',{name:'休息提醒'});
 await expect(reminder.getByText('喝水',{exact:true})).toBeVisible();
 await expect(reminder.getByText('摘耳机',{exact:true})).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCount(1);
 await reminder.getByRole('button',{name:'跳过本次'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await button(page,'拨竹帘').click();
 expect((await stored(page)).courtyard.notes).toHaveLength(0);
 await button(page,'看过了 · 挂叶影笺').click();
 await page.reload();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await nav(page,'手记').click();
 await expect(page.getByText(/离屏看远 ·/)).toBeVisible();
});

test('the dry-weather gathering slip opens shoulder guidance in the same courtyard',async({page})=>{
 await page.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{current:{time:'2026-11-11T12:00',weather_code:0}}}));
 await page.goto('/');
 await expect(page.getByText(/· 晴/)).toBeVisible();
 await page.locator('.yard-scene').evaluate(element=>element.setAttribute('data-continuity','same'));
 await pin(page,'竹签筒').click();
 await button(page,'从竹筒抽一支').click();
 await button(page,'翻签看文').click();
 await expect(page.locator('.yard-slip')).toContainText('檐下收叶');
 await button(page,'拿起药篓').click();
 await expect(page.getByRole('heading',{name:'肩胛轻夹'})).toBeVisible();
 await expect(page.locator('.yard-scene')).toHaveAttribute('data-continuity','same');
 await expect(page.locator('.yard-water-clock')).toBeVisible();
 await nav(page,'手记').click();
 await expect(page.locator('.yard-scene')).toHaveAttribute('data-continuity','same');
 await nav(page,'我的节奏').click();
 await expect(page.locator('.yard-scene')).toHaveAttribute('data-continuity','same');
});
