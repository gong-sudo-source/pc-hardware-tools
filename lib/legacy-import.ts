import {z} from 'zod';
import {categories,pcSchema,statuses,today,type PC} from './domain';
const oldMoney=z.union([z.number(),z.string(),z.null(),z.undefined()]);
const oldPart=z.object({category:z.string().optional(),model:z.string().optional(),aiPrice:oldMoney,listPrice:oldMoney,soldPrice:oldMoney,status:z.enum(statuses).optional(),soldDate:z.string().optional()}).passthrough();
const oldPc=z.object({name:z.string().optional(),alias:z.string().optional(),purchaseDate:z.string().optional(),source:z.string().optional(),purchasePrice:oldMoney,expenses:oldMoney,memo:z.string().optional(),image:z.string().optional(),photoRef:z.string().optional(),photoDisabled:z.boolean().optional(),parts:z.array(oldPart).max(200)}).passthrough();
const oldBackup=z.object({pcs:z.array(oldPc).max(1000)});
function amount(v:unknown,nullable=false):number|null {if(v===''||v==null)return nullable?null:0;const n=Number(v);if(!Number.isFinite(n)||n<0||n>100000)throw Error('기존 기록에 잘못된 금액이 있습니다. 원본을 확인하세요.');return Math.round(n*10000);}
export function convertLegacy(raw:unknown){
 const old=oldBackup.parse(raw);const warnings:string[]=[];
 const images:Array<{index:number,image?:string,photoRef?:string}>=[];
 const pcs=old.pcs.map((p,index):PC=>{
  if(!p.purchaseDate)warnings.push(`${p.name||'PC'}: 구매일이 없어 가져온 날짜를 사용합니다.`);
  if(!p.photoDisabled&&(p.image||p.photoRef))images.push({index,image:p.image,photoRef:p.photoRef});
  return pcSchema.parse({id:crypto.randomUUID(),name:p.name||'PC',alias:p.alias||'',purchase_date:p.purchaseDate||today(),purchase_source:p.source||'',purchase_price:amount(p.purchasePrice),extra_cost:amount(p.expenses),notes:p.memo||'',photo_path:null,photo_crop:null,parts:p.parts.map(x=>{
   const category=(x.category||'기타').replaceAll(' + ','+').replace('시스템 팬','시스템팬');
   if(!categories.includes(category as typeof categories[number]))throw Error(`알 수 없는 부품 분류: ${category}`);
   const sold=x.status==='판매완료';const sale=amount(x.soldPrice,true);
   if(sold&&!x.soldDate)warnings.push(`${p.name} / ${x.model||'부품'}: 판매일이 없어 가져온 날짜를 사용합니다.`);
   return {id:crypto.randomUUID(),category,name:x.model||'미입력 부품',ai_price:amount(x.aiPrice,true),listing_price:amount(x.listPrice,true),sale_price:sold?(sale??0):null,status:sold?'판매완료':x.status||'보유',sold_at:sold?(x.soldDate||today()):null,draft_sale_price:sold?null:sale,draft_sold_at:sold?null:x.soldDate||null};
  })});
 });return {pcs,images,warnings};
}
