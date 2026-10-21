import {describe,it,expect} from 'vitest';
import {settlement,backupSchema,pcSchema,type PC} from '../lib/domain';
const pc:PC={id:'32c7bd5a-ae97-45fb-9c60-fb40dfd41b63',name:'PC01',purchase_date:'2026-10-09',purchase_source:'당근',purchase_price:100,extra_cost:10,notes:'',photo_path:null,parts:[{id:'c275bb81-41f2-475f-8d6d-d691c2f87e8c',category:'GPU',name:'GPU',ai_price:80,listing_price:90,sale_price:0,sold_at:'2026-10-09'},{id:'3abc71e3-04ee-4ca9-ad4c-729d429fe97d',category:'RAM',name:'RAM',ai_price:40,listing_price:null,sale_price:null,sold_at:null}]};
describe('정산 및 백업',()=>{
 it('0원 판매를 완료로 계산하고 미판매 부품만 예상액에 포함한다',()=>expect(settlement([pc])).toEqual({cost:110,recovered:0,profit:-110,remaining:40,expected:40,net:-70,roi:-70/110*100}));
 it('등록가 우선, AI 추천가 차선, 미입력은 0원',()=>{const p=structuredClone(pc);p.parts[0].sale_price=null;expect(settlement([p]).remaining).toBe(130)});
 it('매입비 0원은 수익률을 계산하지 않는다',()=>expect(settlement([]).roi).toBeNull());
 it('음수·소수·잘못된 날짜 및 백업 버전을 거부한다',()=>{expect(pcSchema.safeParse({...pc,purchase_price:-1}).success).toBe(false);expect(pcSchema.safeParse({...pc,extra_cost:1.5}).success).toBe(false);expect(pcSchema.safeParse({...pc,purchase_date:'2026-02-30'}).success).toBe(false);expect(backupSchema.safeParse({version:1,pcs:[pc]}).success).toBe(false)});
 it('백업 왕복이 판매 기록을 보존한다',()=>expect(backupSchema.parse(JSON.parse(JSON.stringify({version:2,pcs:[pc]}))).pcs[0]).toEqual(pc));
});
