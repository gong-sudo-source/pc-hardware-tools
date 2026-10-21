import { z } from 'zod';
export const categories = ['CPU','CPU 쿨러','CPU+쿨러 세트','CPU+메인보드 콤보','메인보드','RAM','GPU','SSD','HDD','PSU','케이스','시스템팬','기타'] as const;
const money = z.number().int().min(0).max(1000000000);
const date = z.iso.date();
export const statuses=['보유','판매 등록','예약','판매완료'] as const;
export const cropSchema=z.object({y:z.number().nonnegative(),width:z.number().positive(),height:z.number().positive(),originalHeight:z.number().positive()});
export const partSchema = z.object({id:z.uuid(),quantity:z.number().int().min(1).max(100000).optional(),category:z.enum(categories),name:z.string().min(1).max(200),ai_price:money.nullable(),listing_price:money.nullable(),sale_price:money.nullable(),sold_at:date.nullable(),status:z.enum(statuses).optional(),draft_sale_price:money.nullable().optional(),draft_sold_at:date.nullable().optional(),listing_low:money.nullable().optional(),listing_high:money.nullable().optional(),retained:z.boolean().optional(),price_source:z.enum(["manual","history"]).optional(),range_source:z.enum(["manual","history"]).optional()}).refine(p=>p.listing_low==null||p.listing_high==null||p.listing_low<=p.listing_high,{message:"등록 범위 하한은 상한보다 클 수 없습니다.",path:["listing_low"]}).refine(p=>!p.retained||p.sale_price===null,{message:"판매완료 부품은 개인 보관으로 표시할 수 없습니다.",path:["retained"]});
export const pcSchema = z.object({id:z.uuid(),name:z.string().min(1).max(200),alias:z.string().max(500).optional(),purchase_date:date,purchase_source:z.string().max(500),purchase_price:money,extra_cost:money,notes:z.string().max(10000),photo_path:z.string().max(500).nullable(),photo_crop:cropSchema.nullable().optional(),parts:z.array(partSchema).max(200),updated_at:z.string().optional(),kind:z.enum(["pc","item"]).optional(),completed:z.boolean().optional()});
export const backupSchema=z.object({version:z.literal(2),pcs:z.array(pcSchema).max(1000),photos:z.record(z.string(),z.string().max(7500000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)).optional()});
export type Part=z.infer<typeof partSchema>;
export type PC=z.infer<typeof pcSchema>;
export function settlement(pcs:PC[]) {const cost=pcs.reduce((s,p)=>s+p.purchase_price+p.extra_cost,0);const parts=pcs.flatMap(p=>p.parts);const recovered=parts.reduce((s,p)=>s+(p.sale_price??0),0);const remaining=parts.filter(p=>p.sale_price===null&&!p.retained).reduce((s,p)=>s+((p.listing_low!=null&&p.listing_high!=null)?Math.round((p.listing_low+p.listing_high)/2):(p.listing_price??p.ai_price??0)),0);return {cost,recovered,profit:recovered-cost,remaining,expected:recovered+remaining,net:recovered+remaining-cost,roi:cost?((recovered+remaining-cost)/cost)*100:null};}
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());



