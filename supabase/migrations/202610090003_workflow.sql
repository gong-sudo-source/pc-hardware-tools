-- Additive workflow fields. Existing amounts and historical sale dates remain.
begin;
alter table public.pcs add column if not exists kind text not null default 'pc' check(kind in ('pc','item'));
alter table public.pcs add column if not exists completed boolean not null default false;
create or replace function public.validate_workflow() returns trigger language plpgsql set search_path='' as $$
declare p jsonb; k text; lo numeric; hi numeric;
begin
 for p in select value from jsonb_array_elements(new.parts) loop
  foreach k in array array['listing_low','listing_high'] loop
   if p->>k is not null and (jsonb_typeof(p->k)<>'number' or (p->>k)::numeric not between 0 and 1000000000 or (p->>k)::numeric<>trunc((p->>k)::numeric)) then raise exception 'Invalid listing range'; end if;
  end loop;
  lo=(p->>'listing_low')::numeric; hi=(p->>'listing_high')::numeric;
  if lo is not null and hi is not null and lo>hi then raise exception 'Range lower bound exceeds upper bound'; end if;
  if p ? 'retained' and jsonb_typeof(p->'retained')<>'boolean' then raise exception 'Invalid retained flag'; end if;
  if coalesce((p->>'retained')::boolean,false) and p->>'sale_price' is not null then raise exception 'Sold part cannot be retained'; end if;
 end loop;
 return new;
end $$;
create trigger zzz_validate_workflow before insert or update on public.pcs for each row execute function public.validate_workflow();
create or replace function public.restore_pcs(records jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.is_allowed() then raise exception 'Forbidden'; end if;
 if jsonb_typeof(records)<>'array' or jsonb_array_length(records)>1000 then raise exception 'Invalid backup'; end if;
 insert into public.pcs(id,user_id,name,alias,purchase_date,purchase_source,purchase_price,extra_cost,notes,photo_path,photo_crop,parts,kind,completed)
 select r.id,auth.uid(),r.name,coalesce(r.alias,''),r.purchase_date,r.purchase_source,r.purchase_price,r.extra_cost,r.notes,r.photo_path,r.photo_crop,r.parts,coalesce(r.kind,'pc'),coalesce(r.completed,false)
 from jsonb_to_recordset(records) as r(id uuid,name text,alias text,purchase_date date,purchase_source text,purchase_price bigint,extra_cost bigint,notes text,photo_path text,photo_crop jsonb,parts jsonb,kind text,completed boolean);
end $$;
commit;
