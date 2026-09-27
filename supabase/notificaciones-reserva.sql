-- Tabla de logs de notificaciones de reserva.
-- IMPORTANTE: public.reservas.id en este proyecto es bigint, por eso reserva_id tambien es bigint.
-- Migracion idempotente: conserva los logs existentes. Ejecutar ANTES del deploy.
-- Si existe un tipo incompatible, se detiene sin borrar informacion.

begin;

create table if not exists public.notificaciones_reserva (
  id uuid primary key default gen_random_uuid(),
  reserva_id bigint references public.reservas(id) on delete set null,
  tipo text not null,
  destinatario text not null,
  estado text not null default 'pendiente' check (estado in ('enviado', 'error', 'pendiente')),
  error text,
  provider_id text,
  creado_en timestamptz not null default now()
);

do $$
declare
  tipo_reserva oid;
  tipo_log oid;
  restriccion record;
begin
  select atttypid into tipo_reserva from pg_attribute
  where attrelid = 'public.reservas'::regclass and attname = 'id';
  select atttypid into tipo_log from pg_attribute
  where attrelid = 'public.notificaciones_reserva'::regclass and attname = 'reserva_id';
  if tipo_log is distinct from tipo_reserva then
    raise exception 'reserva_id y reservas.id tienen tipos distintos. Revisar los datos antes de migrar; no se borraron logs.';
  end if;

  for restriccion in
    select conname from pg_constraint
    where conrelid = 'public.notificaciones_reserva'::regclass
      and contype = 'c'
      and conkey = array[(select attnum from pg_attribute
        where attrelid = 'public.notificaciones_reserva'::regclass and attname = 'tipo')]::smallint[]
  loop
    execute format('alter table public.notificaciones_reserva drop constraint %I', restriccion.conname);
  end loop;
end $$;

alter table public.notificaciones_reserva add column if not exists provider_id text;
alter table public.notificaciones_reserva add constraint notificaciones_reserva_tipo_check
  check (tipo in ('correo_refugio', 'correo_cliente', 'equipo_nueva_reserva', 'cliente_reserva'));

create index if not exists notificaciones_reserva_reserva_tipo_idx
  on public.notificaciones_reserva(reserva_id, tipo);

alter table public.notificaciones_reserva enable row level security;

drop policy if exists "Admins leen logs de notificaciones" on public.notificaciones_reserva;
create policy "Admins leen logs de notificaciones"
on public.notificaciones_reserva
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where (au.user_id = auth.uid()
       or lower(au.email) = lower(auth.jwt() ->> 'email'))
      and au.rol = 'admin'
  )
);

-- La Edge Function escribe con SUPABASE_SERVICE_ROLE_KEY, por eso no se crea una policy publica de insert.
grant select, insert, update on public.notificaciones_reserva to service_role;
grant select on public.notificaciones_reserva to authenticated;

commit;
