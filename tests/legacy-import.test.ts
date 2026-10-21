import {describe,it,expect} from 'vitest';
import {convertLegacy} from '../lib/legacy-import';
import {settlement,backupSchema} from '../lib/domain';
import {portableHtml} from '../lib/backup';
const old={pcs:[{id:'old-id',name:'PC 01',alias:'5600X + RTX 3070',purchaseDate:'2026-10-01',source:'당근',purchasePrice:52,expenses:1.5,memo:'테스트',photoRef:'pc-5600x-3070',parts:[{id:'p1',category:'CPU + 쿨러 세트',model:'5600X',aiPrice:13.5,listPrice:14,soldPrice:15,status:'판매완료',soldDate:'2026-10-05'},{category:'시스템 팬',model:'팬',aiPrice:1,listPrice:'',soldPrice:0,status:'예약',soldDate:''}]}]};
describe('v1.4 기록 이전',()=>{
 it('만원을 원으로 변환하고 별칭·판매일·사진 참조를 보존한다',()=>{const {pcs,images}=convertLegacy(old);expect(pcs[0].purchase_price).toBe(520000);expect(pcs[0].extra_cost).toBe(15000);expect(pcs[0].alias).toBe(old.pcs[0].alias);expect(pcs[0].parts[0]).toMatchObject({category:'CPU+쿨러 세트',ai_price:135000,sale_price:150000,sold_at:'2026-10-05'});expect(images).toEqual([{index:0,image:undefined,photoRef:'pc-5600x-3070'}]);expect(settlement(pcs).recovered).toBe(150000)});
 it('예약·보유의 가격은 매출로 계산하지 않고 입력값은 보존한다',()=>{const {pcs}=convertLegacy(old);expect(pcs[0].parts[1]).toMatchObject({category:'시스템팬',status:'예약',sale_price:null,draft_sale_price:0});expect(settlement(pcs).remaining).toBe(10000)});
 it('0원 판매완료와 미입력을 구분한다',()=>{const raw=structuredClone(old);raw.pcs[0].parts[0].soldPrice=0;expect(convertLegacy(raw).pcs[0].parts[0].sale_price).toBe(0)});
 it('잘못된 금액·날짜·분류는 거부한다',()=>{const raw=structuredClone(old);raw.pcs[0].purchasePrice=-1;expect(()=>convertLegacy(raw)).toThrow();raw.pcs[0].purchasePrice=52;raw.pcs[0].purchaseDate='2026-02-30';expect(()=>convertLegacy(raw)).toThrow()});
 it('없는 날짜를 경고하고 JSON 왕복을 지원한다',()=>{const raw=structuredClone(old);raw.pcs[0].purchaseDate='';const result=convertLegacy(raw);expect(result.warnings).toHaveLength(1);expect(backupSchema.parse(JSON.parse(JSON.stringify({version:2,pcs:result.pcs}))).pcs).toEqual(result.pcs)});
 it('열람용 HTML이 원본 데이터를 내장하고 HTML 삽입을 이스케이프한다',()=>{const {pcs}=convertLegacy(old);pcs[0].name='<script>alert(1)</script>';const html=portableHtml({version:2,pcs});expect(html).not.toContain('<h2><script>');expect(html).toContain('&lt;script&gt;');const embedded=html.match(/<script id="embeddedState" type="application\/json">([\s\S]*?)<\/script>/)![1];expect(backupSchema.parse(JSON.parse(embedded)).pcs[0].name).toBe(pcs[0].name)});
});
