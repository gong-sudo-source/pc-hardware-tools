-- Apply once to a new project. Never reset a production database.
create table public.allowed_users (email text primary key check (email = lower(email)));
alter table public.allowed_users enable row level security;
revoke all on public.allowed_users from anon, authenticated;
-- Add your one permitted email using the SQL editor before logging in:
-- insert into public.allowed_users(email) values ('you@example.com');
create function public.is_allowed() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.allowed_users where email=lower(auth.jwt()->>'email'));
$$;
revoke all on function public.is_allowed() from public;
grant execute on function public.is_allowed() to authenticated;
create table public.pcs (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users(id),
 name text not null check(length(name) between 1 and 200),
 purchase_date date not null,
 purchase_source text not null default '' check(length(purchase_source)<=500),
 purchase_price bigint not null default 0 check(purchase_price between 0 and 1000000000),
 extra_cost bigint not null default 0 check(extra_cost between 0 and 1000000000),
 notes text not null default '' check(length(notes)<=10000),
 photo_path text,
 parts jsonb not null default '[]',
 updated_at timestamptz not null default now()
);
create index pcs_owner on public.pcs(user_id);
alter table public.pcs enable row level security;
create policy pc_owner on public.pcs for all to authenticated
 using (user_id=auth.uid() and public.is_allowed()) with check (user_id=auth.uid() and public.is_allowed());
revoke all on public.pcs from authenticated;
grant select,insert,update,delete on public.pcs to authenticated;
revoke all on public.pcs from anon;
create function public.validate_pc() returns trigger language plpgsql set search_path='' as $$
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
  elsif previous->>'sale_price' is not null then p=jsonb_set(p,'{sold_at}',coalesce(previous->'sold_at',to_jsonb((now() at time zone 'Asia/Seoul')::date::text)));
  else p=jsonb_set(p,'{sold_at}',to_jsonb(coalesce((p->>'sold_at')::date,(now() at time zone 'Asia/Seoul')::date)::text)); end if;
  result=result || jsonb_build_array(p);
 end loop;
 new.parts=result; new.updated_at=now(); return new;
end $$;
create trigger validate_pc before insert or update on public.pcs for each row execute function public.validate_pc();
-- Atomic additive restore: remap IDs in the client; existing records are untouched.
create function public.restore_pcs(records jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.is_allowed() then raise exception 'Forbidden'; end if;
 if jsonb_typeof(records)<>'array' or jsonb_array_length(records)>1000 then raise exception 'Invalid backup'; end if;
 insert into public.pcs(id,user_id,name,purchase_date,purchase_source,purchase_price,extra_cost,notes,photo_path,parts)
 select r.id,auth.uid(),r.name,r.purchase_date,r.purchase_source,r.purchase_price,r.extra_cost,r.notes,r.photo_path,r.parts
 from jsonb_to_recordset(records) as r(id uuid,name text,purchase_date date,purchase_source text,purchase_price bigint,extra_cost bigint,notes text,photo_path text,parts jsonb);
end $$;
revoke all on function public.restore_pcs(jsonb) from public;
grant execute on function public.restore_pcs(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('pc-photos','pc-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy own_photos on storage.objects for all to authenticated
 using(bucket_id='pc-photos' and (storage.foldername(name))[1]=auth.uid()::text and public.is_allowed())
 with check(bucket_id='pc-photos' and (storage.foldername(name))[1]=auth.uid()::text and public.is_allowed());
