import {categories,type Part,type PC} from './domain';
export const defaultCategories:typeof categories[number][]=['CPU','메인보드','RAM','SSD','PSU','케이스','GPU'];
export function blankPart(category:Part['category']):Part{return {id:crypto.randomUUID(),category,name:category,ai_price:null,listing_price:null,listing_low:null,listing_high:null,sale_price:null,sold_at:null,status:'보유',retained:false};}
export function defaultParts(){return defaultCategories.map(blankPart)}
export function unsold(parts:Part[]){return parts.filter(p=>p.sale_price===null&&!p.retained)}
export function movePart(parts:Part[],id:string,targetId:string){const from=parts.findIndex(p=>p.id===id),to=parts.findIndex(p=>p.id===targetId);if(from<0||to<0||from===to)return parts;const next=[...parts];const [part]=next.splice(from,1);next.splice(to,0,part);return next;}
const modelKey=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/\s+/g,'').trim();
export function historyPrice(part:Part,pcs:PC[]){
 const key=modelKey(part.name);if(!key||key===modelKey(part.category)||key==='새부품')return null;
 const matches=pcs.flatMap(p=>p.parts).filter(p=>p.id!==part.id&&p.category===part.category&&modelKey(p.name)===key&&p.sale_price!==null&&!p.retained);
 if(!matches.length)return null;
 const values=matches.map(p=>p.sale_price!).sort((a,b)=>a-b);const mid=Math.floor(values.length/2);
 return {median:values.length%2?values[mid]:Math.round((values[mid-1]+values[mid])/2),low:values[0],high:values[values.length-1],count:values.length};
}
export function fillHistory(part:Part,pcs:PC[]):Part {const suggestion=historyPrice(part,pcs);if(!suggestion||part.retained||part.sale_price!==null)return part;return {...part,...(part.ai_price===null||part.price_source==='history'?{ai_price:suggestion.median,price_source:'history' as const}:{}),...((part.listing_price==null&&part.listing_low==null&&part.listing_high==null)||part.range_source==='history'?{listing_low:suggestion.low,listing_high:suggestion.high,range_source:'history' as const}:{})};}
export function saleRange(part:Part){
 const low=part.listing_low??part.listing_price,high=part.listing_high??part.listing_price;
 if(part.sale_price===null||low==null||high==null||low>high)return null;
 const mid=(low+high)/2,half=Math.max((high-low)/2,mid*.1,1000);
 const score=Math.max(-1,Math.min(1,(part.sale_price-mid)/(half*2)));
 const intensity=Math.abs(score);const hue=score<-.04?5:score>.04?145:42;
 return {score,low,high,background:`hsl(${hue} ${score<-.04?68:score>.04?44:65}% ${96-intensity*8}%)`,border:`hsl(${hue} 45% ${86-intensity*12}%)`,color:score<-.04?'#982c21':score>.04?'#095d38':'#795915'};
}

