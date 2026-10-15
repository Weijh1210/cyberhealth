export type Language='zh'|'en';
export type Season='spring'|'summer'|'autumn'|'winter';
type Bilingual={zh:string;en:string};
export type SeasonalContent={id:string;name:Bilingual;description:Bilingual;tip:Bilingual;season:Season};
const rows=[
 ['xiaohan','小寒','Minor Cold','winter','寒意渐深，留意窗边冬日的光。','Notice the quiet light of a winter day.'],
 ['dahan','大寒','Major Cold','winter','岁末寒深，也有等待新绿的耐心。','Deep winter leaves room for the next green shoot.'],
 ['lichun','立春','Start of Spring','spring','春的序章，从一枝新芽开始。','A new bud can mark the beginning of spring.'],
 ['yushui','雨水','Rain Water','spring','以雨为名，留意身边湿润的空气。','This term takes its name from rain.'],
 ['jingzhe','惊蛰','Awakening of Insects','spring','春雷与虫鸣，是传统时令的意象。','Thunder and insects are images of the changing season.'],
 ['chunfen','春分','Spring Equinox','spring','昼夜的平衡，给忙碌一点留白。','The equinox invites a little balance in the day.'],
 ['qingming','清明','Pure Brightness','spring','清明时节，看看身边的草木。','Pause to notice the plants around you.'],
 ['guyu','谷雨','Grain Rain','spring','雨与谷物，是节令与农事的联系。','Rain and grain recall the agricultural calendar.'],
 ['lixia','立夏','Start of Summer','summer','夏日初至，树荫慢慢变得浓密。','The first shade of summer feels welcome.'],
 ['xiaoman','小满','Grain Buds','summer','小满的名字，也适合不必圆满的日常。','A little fullness can be enough for today.'],
 ['mangzhong','芒种','Grain in Ear','summer','芒与种，记录农事忙碌的季节。','Its name reflects a busy agricultural season.'],
 ['xiazhi','夏至','Summer Solstice','summer','北半球的长日，让休息也有位置。','Leave room for a pause on a long northern day.'],
 ['xiaoshu','小暑','Minor Heat','summer','暑意初来，留意一处凉爽的阴影。','Notice a patch of cool shade.'],
 ['dashu','大暑','Major Heat','summer','夏日热烈，日常节奏可以温和一点。','Meet the height of summer at your own pace.'],
 ['liqiu','立秋','Start of Autumn','autumn','节令入秋，天气仍由当地实际情况决定。','The calendar turns to autumn; local weather may differ.'],
 ['chushu','处暑','End of Heat','autumn','暑气渐退，是时令里的温柔期待。','The season carries the hope of gentler warmth.'],
 ['bailu','白露','White Dew','autumn','露水与晨光，是白露的自然意象。','Dew and morning light are images of White Dew.'],
 ['qiufen','秋分','Autumn Equinox','autumn','昼夜渐平，给一天留一个从容的间隙。','Make room for a calm pause near the equinox.'],
 ['hanlu','寒露','Cold Dew','autumn','寒露取清凉露水之意，看看秋叶的颜色。','Cold Dew evokes cool droplets and autumn leaves.'],
 ['shuangjiang','霜降','Frost Descent','autumn','以霜为名，身边的季节值得慢慢观察。','A name of frost invites a closer look at the season.'],
 ['lidong','立冬','Start of Winter','winter','冬的序章，也可以从一次短休息开始。','Start a winter day with one small pause.'],
 ['xiaoxue','小雪','Minor Snow','winter','雪的意象，不代表每个地方都会下雪。','Snow is a seasonal image, not a local forecast.'],
 ['daxue','大雪','Major Snow','winter','以雪为景，珍惜日常里的温暖片刻。','A snowy image can frame a warm everyday moment.'],
 ['dongzhi','冬至','Winter Solstice','winter','北半球短日之后，光会慢慢回来。','After the shortest northern days, light gradually returns.'],
] as const;
const tips:Record<Season,Bilingual>={spring:{zh:'看一眼窗外，再决定是否活动。',en:'Look away from the screen, then choose a convenient break.'},summer:{zh:'留意环境与天气，只做此刻方便的活动。',en:'Consider the weather and choose a convenient movement.'},autumn:{zh:'放慢片刻，看看身边一抹叶色。',en:'Take a moment to notice a leaf colour.'},winter:{zh:'按舒适程度休息，不必追赶节奏。',en:'Pause comfortably, without rushing.'}};
export const seasonalContents:SeasonalContent[]=rows.map(([id,zh,en,season,desc,descEn])=>({id,name:{zh,en},description:{zh:desc,en:descEn},tip:tips[season],season}));
export const fortuneCards=[
 {id:'space',blessing:{zh:'愿今天留有余地',en:'May today leave you some space'},copy:{zh:'给自己半分钟，思路也能透口气。',en:'Give yourself a small pause between tasks.'},activityId:'chin-tuck'},
 {id:'gentle',blessing:{zh:'愿你从容一点',en:'May your pace feel gentle'},copy:{zh:'不用做很多，一点点也算数。',en:'A little can count, without doing a lot.'},activityId:'scapular-squeeze'},
 {id:'small',blessing:{zh:'愿小小行动陪着你',en:'May one small move keep you company'},copy:{zh:'今天的认真，也可以包括好好休息。',en:'Taking a break can be part of a thoughtful day.'},activityId:'neck-rotation'},
 {id:'light',blessing:{zh:'愿你遇见一束光',en:'May you notice a little light'},copy:{zh:'先把目光从任务移开，再看看此刻。',en:'Take your attention off the task for a moment.'},activityId:'easy-walk'},
 {id:'again',blessing:{zh:'愿你随时重新开始',en:'May you begin again whenever you like'},copy:{zh:'中断不是归零，今天仍可以慢慢积累。',en:'A gap does not erase what you have done.'},activityId:'seated-march'},
 {id:'enough',blessing:{zh:'愿此刻刚刚好',en:'May this moment feel enough'},copy:{zh:'不追赶，不比较，按自己的节奏。',en:'No racing or comparing; go at your own pace.'},activityId:'ankle-stretch'},
];
