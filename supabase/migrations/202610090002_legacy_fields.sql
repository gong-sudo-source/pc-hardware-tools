-- Additive compatibility migration. No rows or original fields are removed.
begin;
alter table public.pcs add column if not exists alias text not null default '' check(length(alias)<=500);
alter table public.pcs add column if not exists photo_crop jsonb;
-- Reuse the original validation trigger, then enforce status consistency and
-- allow a user-specified sale date to be corrected as in v1.4.
create or replace function public.validate_pc() returns trigger language plpgsql set search_path='' as $$
declare p jsonb; previous jsonb; result jsonb='[]'; ids text[]='{}'; k text;
begin
 if jsonb_typeof(new.parts)<>'array' or jsonb_array_length(new.parts)>200 then raise exception 'Invalid parts'; end if;
 if new.photo_path is not null and new.photo_path not like new.user_id::text || '/%' then raise exception 'Invalid photo owner'; end if;
 for p in select value from jsonb_array_elements(new.parts) loop
  if p->>'id' is null or p->>'id'=any(ids) then raise exception 'Invalid part ID'; end if;
  perform (p->>'id')::uuid; ids=array_append(ids,p->>'id');
  if p->>'category' is null or p->>'category' not in ('CPU','CPU 쿨러','CPU+쿨러 세트','CPU+메인보드 콤보','메인보드','RAM','GPU','SSD','HDD','PSU','케이스','시스템팬','기타') or length(coalesce(p->>'name','')) not between 1 and 200 then raise exception 'Invalid part'; end if;
  foreach k in array array['ai_price','listing_price','sale_price'] loop
   if not p ? k or (p->>k is not null and (jsonb_typeof(p->k)<>'number' or (p->>k)::numeric not between 0 and 1000000000 or (p->>k)::numeric<>trunc((p->>k)::numeric))) then raise exception 'Invalid price'; end if;
  end loop;
  previous=null;
  if TG_OP='UPDATE' then select value into previous from jsonb_array_elements(old.parts) where value->>'id'=p->>'id'; end if;
  if p->>'sale_price' is null then p=jsonb_set(p,'{sold_at}','null');
  elsif previous->>'sale_price' is not null then p=jsonb_set(p,'{sold_at}',to_jsonb(coalesce((p->>'sold_at')::date,(previous->>'sold_at')::date,(now() at time zone 'Asia/Seoul')::date)::text));
  else p=jsonb_set(p,'{sold_at}',to_jsonb(coalesce((p->>'sold_at')::date,(now() at time zone 'Asia/Seoul')::date)::text)); end if;
  result=result || jsonb_build_array(p);
 end loop;
 new.parts=result; new.updated_at=now(); return new;
end $$;
create or replace function public.sync_legacy_parts() returns trigger language plpgsql set search_path='' as $$
declare p jsonb; result jsonb='[]';
begin
 if new.photo_crop is not null and (jsonb_typeof(new.photo_crop)<>'object'
  or not (new.photo_crop ?& array['y','width','height','originalHeight'])
  or (new.photo_crop->>'y')::numeric<0
  or (new.photo_crop->>'width')::numeric<=0
  or (new.photo_crop->>'height')::numeric<=0
  or (new.photo_crop->>'originalHeight')::numeric<=0) then raise exception 'Invalid photo crop'; end if;
 for p in select value from jsonb_array_elements(new.parts) loop
  if p->>'sale_price' is not null then
   p=jsonb_set(p,'{status}','"판매완료"');
  else
   if p->>'status' is null or p->>'status'='판매완료' then p=jsonb_set(p,'{status}','"보유"'); end if;
  end if;
  if p->>'status' not in ('보유','판매 등록','예약','판매완료') then raise exception 'Invalid status'; end if;
  result=result || jsonb_build_array(p);
 end loop;
 new.parts=result; return new;
end $$;
create trigger zz_sync_legacy_parts before insert or update on public.pcs for each row execute function public.sync_legacy_parts();
-- Restore includes new optional fields; existing backup formats still work.
create or replace function public.restore_pcs(records jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.is_allowed() then raise exception 'Forbidden'; end if;
 if jsonb_typeof(records)<>'array' or jsonb_array_length(records)>1000 then raise exception 'Invalid backup'; end if;
 insert into public.pcs(id,user_id,name,alias,purchase_date,purchase_source,purchase_price,extra_cost,notes,photo_path,photo_crop,parts)
 select r.id,auth.uid(),r.name,coalesce(r.alias,''),r.purchase_date,r.purchase_source,r.purchase_price,r.extra_cost,r.notes,r.photo_path,r.photo_crop,r.parts
 from jsonb_to_recordset(records) as r(id uuid,name text,alias text,purchase_date date,purchase_source text,purchase_price bigint,extra_cost bigint,notes text,photo_path text,photo_crop jsonb,parts jsonb);
end $$;
commit;

