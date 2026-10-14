import {currentSolarTerm} from './seasonal';
const colors=[{name:'竹青',hex:'#52765d',tag:'green',prompt:'找一处接近竹叶的绿色。'},{name:'杏黄',hex:'#bb873d',tag:'color',prompt:'找一处温暖的黄色。'},{name:'雾蓝',hex:'#678891',tag:'color',prompt:'留意一处柔和的蓝色。'},{name:'柿橙',hex:'#b2673f',tag:'color',prompt:'寻找一抹像熟柿子的橙色。'}];
export function localDay(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function dailyTheme(d:Date){const key=localDay(d);let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))>>>0;return colors[hash%colors.length];}
export function cultureOfDay(d:Date){const term=currentSolarTerm(d);if(term)return {name:term.name,desc:'顺着季节的节奏，给今天留一个从容的小间隙。'};const m=d.getMonth()+1;return m>=9&&m<=11?{name:'秋日观察',desc:'风和叶色慢慢变化。今天可以留意一处光影，感受季节的细节。'}:m>=12||m<=2?{name:'冬日留白',desc:'让节奏稍慢一点。看看窗边的光，也是一种短暂休息。'}:m>=3&&m<=5?{name:'春日新绿',desc:'万物舒展时，找一抹身边的新绿。'}:{name:'夏日清风',desc:'在日光和阴影之间，发现一处清凉的颜色。'};}
export function dailyFortune(d:Date){const lines=['今日元气签：留一点空白，思路也能透气。','今日元气签：慢一步，看见身边的小变化。','今日元气签：把这一刻过得轻一些。','今日元气签：休息片刻，也是一种认真。'];const n=Number(localDay(d).replaceAll('-',''));return lines[n%lines.length];}
