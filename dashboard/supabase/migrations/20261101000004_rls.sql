-- RLS por rol: admin y campo leen y escriben; asesor solo lee.
-- El endpoint de sync usa la service role key y no pasa por RLS.

do $$
declare t text;
begin
  foreach t in array public.ganpro_sync_tables() || array[
    'servicios', 'revisacion_toros', 'racion_ingredientes', 'sigsa_stock'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ganpro_select on public.%I for select to authenticated using (public.ganpro_rol() is not null)', t);
    execute format('create policy ganpro_insert on public.%I for insert to authenticated with check (public.ganpro_rol() in (''admin'', ''campo''))', t);
    execute format('create policy ganpro_update on public.%I for update to authenticated using (public.ganpro_rol() in (''admin'', ''campo'')) with check (public.ganpro_rol() in (''admin'', ''campo''))', t);
    execute format('create policy ganpro_delete on public.%I for delete to authenticated using (public.ganpro_rol() in (''admin'', ''campo''))', t);
  end loop;
end $$;

alter table public.sync_tombstones enable row level security;
create policy ganpro_select on public.sync_tombstones for select to authenticated
  using (public.ganpro_rol() is not null);

alter table public.establecimiento enable row level security;
create policy ganpro_select on public.establecimiento for select to authenticated
  using (public.ganpro_rol() is not null);
create policy ganpro_update on public.establecimiento for update to authenticated
  using (public.ganpro_rol() = 'admin') with check (public.ganpro_rol() = 'admin');

alter table public.categorias_config enable row level security;
create policy ganpro_select on public.categorias_config for select to authenticated
  using (public.ganpro_rol() is not null);
create policy ganpro_write on public.categorias_config for all to authenticated
  using (public.ganpro_rol() = 'admin') with check (public.ganpro_rol() = 'admin');

alter table public.perfiles enable row level security;
create policy ganpro_select on public.perfiles for select to authenticated
  using (id = auth.uid() or public.ganpro_rol() = 'admin');
create policy ganpro_update on public.perfiles for update to authenticated
  using (public.ganpro_rol() = 'admin') with check (public.ganpro_rol() = 'admin');
