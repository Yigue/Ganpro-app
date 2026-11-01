-- Sincronización WatermelonDB <-> Supabase.
-- Cada fila lleva server_created_at / server_updated_at (ms) que mantiene un trigger,
-- y los borrados quedan en sync_tombstones. Así los cambios hechos desde el
-- dashboard también bajan al celular en el próximo pull.

create or replace function public.ganpro_sync_tables() returns text[]
language sql immutable as $$
  select array[
    'potreros','lotes','animals','animal_movements','eventos','sync_logs',
    'operations_catalog','operation_logs','scheduled_operations','protocolos_iatf',
    'etapas_protocolo','condicion_corporal','suplementos','raciones',
    'potrero_feeding_logs','manga_action_queue','movimientos_financieros',
    'precios_mercado','agregados_financieros'
  ]
$$;

create table public.sync_tombstones (
  table_name text not null,
  record_id text not null,
  deleted_at bigint not null,
  primary key (table_name, record_id)
);
create index on public.sync_tombstones (deleted_at);

create or replace function public.ganpro_sync_stamp() returns trigger
language plpgsql as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if tg_op = 'INSERT' then
    new.server_created_at := v_now;
    new.created_at := coalesce(new.created_at, v_now);
    new.updated_at := coalesce(new.updated_at, v_now);
    delete from public.sync_tombstones where table_name = tg_table_name and record_id = new.id;
  else
    new.server_created_at := old.server_created_at;
    if new.updated_at is not distinct from old.updated_at then
      new.updated_at := v_now;
    end if;
  end if;
  new.server_updated_at := v_now;
  return new;
end $$;

create or replace function public.ganpro_sync_tombstone() returns trigger
language plpgsql as $$
begin
  insert into public.sync_tombstones (table_name, record_id, deleted_at)
  values (tg_table_name, old.id, (extract(epoch from clock_timestamp()) * 1000)::bigint)
  on conflict (table_name, record_id) do update set deleted_at = excluded.deleted_at;
  return old;
end $$;

create or replace function public.ganpro_enable_sync(p_table text) returns void
language plpgsql as $$
begin
  execute format('alter table public.%I add column if not exists server_created_at bigint not null default 0', p_table);
  execute format('alter table public.%I add column if not exists server_updated_at bigint not null default 0', p_table);
  execute format('create index if not exists %I on public.%I (server_updated_at)', p_table || '_server_updated_at_idx', p_table);
  execute format('drop trigger if exists ganpro_sync_stamp on public.%I', p_table);
  execute format('create trigger ganpro_sync_stamp before insert or update on public.%I for each row execute function public.ganpro_sync_stamp()', p_table);
  execute format('drop trigger if exists ganpro_sync_tombstone on public.%I', p_table);
  execute format('create trigger ganpro_sync_tombstone after delete on public.%I for each row execute function public.ganpro_sync_tombstone()', p_table);
end $$;

do $$
declare t text;
begin
  foreach t in array public.ganpro_sync_tables() loop
    perform public.ganpro_enable_sync(t);
  end loop;
end $$;

-- Pull: devuelve { changes: { tabla: { created, updated, deleted } }, timestamp }
create or replace function public.ganpro_sync_pull(p_last_pulled_at bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  v_since bigint := coalesce(p_last_pulled_at, 0);
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_changes jsonb := '{}'::jsonb;
  v_created jsonb;
  v_updated jsonb;
  v_deleted jsonb;
begin
  foreach t in array public.ganpro_sync_tables() loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(r) - ''server_created_at'' - ''server_updated_at''), ''[]''::jsonb)
         from public.%I r where r.server_created_at > $1', t)
      into v_created using v_since;
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(r) - ''server_created_at'' - ''server_updated_at''), ''[]''::jsonb)
         from public.%I r where r.server_created_at <= $1 and r.server_updated_at > $1', t)
      into v_updated using v_since;
    if v_since = 0 then
      v_deleted := '[]'::jsonb;
    else
      select coalesce(jsonb_agg(record_id), '[]'::jsonb) into v_deleted
        from public.sync_tombstones where table_name = t and deleted_at > v_since;
    end if;
    v_changes := v_changes || jsonb_build_object(
      t, jsonb_build_object('created', v_created, 'updated', v_updated, 'deleted', v_deleted));
  end loop;
  return jsonb_build_object('changes', v_changes, 'timestamp', v_now);
end $$;

-- Push: aplica { tabla: { created, updated, deleted } } en una sola transacción.
-- Rechaza el push si algún registro cambió en el servidor después del último pull;
-- WatermelonDB entonces hace pull y reintenta.
create or replace function public.ganpro_sync_push(p_changes jsonb, p_last_pulled_at bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  t text;
  v_since bigint := coalesce(p_last_pulled_at, 0);
  v_conflict boolean;
  v_rec jsonb;
  v_cols text[];
  v_col_list text;
  v_set_list text;
  v_found boolean;
begin
  for t in select key from jsonb_each(coalesce(p_changes, '{}'::jsonb)) loop
    if not t = any(public.ganpro_sync_tables()) then
      continue;
    end if;

    execute format(
      'select exists (select 1 from public.%I x
         join jsonb_array_elements($1) e on x.id = e->>''id''
        where x.server_updated_at > $2)', t)
      into v_conflict using coalesce(p_changes->t->'updated', '[]'::jsonb), v_since;
    if v_conflict then
      raise exception 'GANPRO_SYNC_CONFLICT: % cambió en el servidor después del último pull', t
        using errcode = '40001';
    end if;

    for v_rec in
      select value from jsonb_array_elements(
        coalesce(p_changes->t->'created', '[]'::jsonb) || coalesce(p_changes->t->'updated', '[]'::jsonb))
    loop
      select array_agg(c.column_name::text order by c.ordinal_position) into v_cols
        from information_schema.columns c
       where c.table_schema = 'public' and c.table_name = t
         and c.column_name not in ('server_created_at', 'server_updated_at')
         and v_rec ? c.column_name;
      if v_cols is null or not 'id' = any(v_cols) then
        continue;
      end if;
      select string_agg(format('%I', c), ', ') into v_col_list from unnest(v_cols) c;
      select string_agg(format('%I = r.%I', c, c), ', ') into v_set_list
        from unnest(v_cols) c where c <> 'id';
      v_found := false;
      if v_set_list is not null then
        execute format(
          'update public.%I x set %s from jsonb_populate_record(null::public.%I, $1) r
            where x.id = r.id returning true', t, v_set_list, t)
          into v_found using v_rec;
      else
        execute format('select true from public.%I where id = $1', t)
          into v_found using v_rec->>'id';
      end if;
      if not coalesce(v_found, false) then
        execute format(
          'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
          t, v_col_list, v_col_list, t)
          using v_rec;
      end if;
    end loop;

    execute format('delete from public.%I where id = any($1)', t)
      using array(select jsonb_array_elements_text(coalesce(p_changes->t->'deleted', '[]'::jsonb)));
  end loop;
end $$;

revoke all on function public.ganpro_sync_pull(bigint) from public;
revoke all on function public.ganpro_sync_push(jsonb, bigint) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.ganpro_sync_pull(bigint) to service_role;
    grant execute on function public.ganpro_sync_push(jsonb, bigint) to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.ganpro_sync_pull(bigint) from anon, authenticated;
    revoke all on function public.ganpro_sync_push(jsonb, bigint) from anon, authenticated;
  end if;
end $$;
