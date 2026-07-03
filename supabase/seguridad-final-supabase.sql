-- Seguridad final Supabase - Refugio La Arboleda
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- Este archivo NO se ejecuta desde la app.
--
-- Objetivo:
-- - La pagina publica puede crear reservas y consultar disponibilidad sin datos sensibles.
-- - Admin y empleado autorizados en admin_users pueden operar el panel.
-- - Usuarios autenticados no autorizados no pueden leer ni modificar reservas.
-- - La eliminacion se hace por RPC con motivo y auditoria.

-- =========================================================
-- 1. Usuarios autorizados y roles del panel
-- =========================================================

create table if not exists public.admin_users (
  id bigserial primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists rol text default 'admin';

update public.admin_users
set rol = 'admin'
where rol is null;

alter table public.admin_users
  alter column rol set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_rol_check'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_rol_check
      check (rol in ('admin', 'empleado'));
  end if;
end $$;

create index if not exists admin_users_user_id_idx
  on public.admin_users(user_id);

create index if not exists admin_users_email_idx
  on public.admin_users(lower(email));

create index if not exists admin_users_rol_idx
  on public.admin_users(rol);

alter table public.admin_users enable row level security;

drop policy if exists admin_users_read_own on public.admin_users;
create policy admin_users_read_own
  on public.admin_users
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Helpers usados por RLS y funciones.
create or replace function public.is_panel_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where (
      user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and rol in ('admin', 'empleado')
  );
$$;

create or replace function public.is_panel_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where (
      user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and rol = 'admin'
  );
$$;

-- Compatibilidad con politicas antiguas que llamaban public.is_admin().
-- En este proyecto significa usuario autorizado del panel: admin o empleado.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_panel_user();
$$;

-- =========================================================
-- 2. Disponibilidad publica segura
-- =========================================================

create or replace function public.obtener_reservas_disponibilidad()
returns table (
  id bigint,
  cabana text,
  fecha_ingreso date,
  fecha_salida date,
  estado text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id::bigint,
    r.cabana::text,
    r.fecha_ingreso::date,
    r.fecha_salida::date,
    r.estado::text
  from public.reservas r
  where lower(coalesce(r.estado::text, '')) in ('pendiente', 'confirmada')
    and r.cabana is not null
    and r.fecha_ingreso is not null
    and r.fecha_salida is not null;
$$;

revoke all on function public.obtener_reservas_disponibilidad() from public;
grant execute on function public.obtener_reservas_disponibilidad()
  to anon, authenticated;

-- =========================================================
-- 3. Auditoria de reservas eliminadas
-- =========================================================

create table if not exists public.reservas_eliminadas (
  id bigserial primary key,
  reserva_id bigint,
  reserva_snapshot jsonb not null,
  motivo text not null,
  eliminado_por uuid,
  eliminado_por_email text,
  eliminado_en timestamptz not null default now()
);

create index if not exists reservas_eliminadas_reserva_id_idx
  on public.reservas_eliminadas(reserva_id);

create index if not exists reservas_eliminadas_eliminado_en_idx
  on public.reservas_eliminadas(eliminado_en desc);

alter table public.reservas_eliminadas enable row level security;

drop policy if exists reservas_eliminadas_admin_select on public.reservas_eliminadas;
create policy reservas_eliminadas_admin_select
  on public.reservas_eliminadas
  for select
  to authenticated
  using (public.is_panel_admin());

-- =========================================================
-- 4. Eliminacion con motivo y auditoria
-- =========================================================

create or replace function public.eliminar_reserva_con_motivo(
  p_reserva_id bigint,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_reserva public.reservas%rowtype;
  v_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para eliminar reservas.';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'El motivo de eliminacion es obligatorio.';
  end if;

  select id, user_id, email, rol
  into v_admin
  from public.admin_users
  where (
    user_id = auth.uid()
    or lower(email) = lower(v_email)
  )
  and rol in ('admin', 'empleado')
  limit 1;

  if not found then
    raise exception 'No tienes permisos para realizar esta accion.';
  end if;

  select *
  into v_reserva
  from public.reservas
  where id = p_reserva_id
  for update;

  if not found then
    raise exception 'La reserva no existe.';
  end if;

  insert into public.reservas_eliminadas (
    reserva_id,
    reserva_snapshot,
    motivo,
    eliminado_por,
    eliminado_por_email
  )
  values (
    v_reserva.id,
    to_jsonb(v_reserva),
    trim(p_motivo),
    auth.uid(),
    coalesce(v_admin.email, v_email)
  );

  update public.reservas
  set estado = 'eliminada'
  where id = p_reserva_id;

  return jsonb_build_object(
    'ok', true,
    'reserva_id', p_reserva_id,
    'estado', 'eliminada'
  );
end;
$$;

revoke all on function public.eliminar_reserva_con_motivo(bigint, text) from public;
grant execute on function public.eliminar_reserva_con_motivo(bigint, text)
  to authenticated;

-- =========================================================
-- 5. Politicas finales de reservas
-- =========================================================

alter table public.reservas enable row level security;

-- Eliminar politicas viejas o inseguras conocidas.
drop policy if exists "Permitir eliminar reservas" on public.reservas;
drop policy if exists reservas_public_calendar on public.reservas;
drop policy if exists reservas_public_select on public.reservas;
drop policy if exists reservas_public_insert on public.reservas;
drop policy if exists reservas_public_update on public.reservas;
drop policy if exists reservas_public_delete on public.reservas;
drop policy if exists reservas_admin_select on public.reservas;
drop policy if exists reservas_admin_insert on public.reservas;
drop policy if exists reservas_admin_update on public.reservas;
drop policy if exists reservas_admin_delete on public.reservas;
drop policy if exists reservas_panel_select on public.reservas;
drop policy if exists reservas_panel_insert on public.reservas;
drop policy if exists reservas_panel_update on public.reservas;
drop policy if exists reservas_panel_delete on public.reservas;

-- La pagina publica puede crear solicitudes. No puede confirmar pagos.
create policy reservas_public_insert
  on public.reservas
  for insert
  to anon
  with check (
    lower(coalesce(estado::text, 'pendiente')) = 'pendiente'
    and coalesce(pago_confirmado, false) = false
  );

-- Usuarios autorizados del panel pueden leer todas las reservas no sensibles para su trabajo.
create policy reservas_panel_select
  on public.reservas
  for select
  to authenticated
  using (public.is_panel_user());

-- Admin y empleado pueden crear reservas desde el panel.
create policy reservas_panel_insert
  on public.reservas
  for insert
  to authenticated
  with check (public.is_panel_user());

-- Admin y empleado pueden actualizar reservas.
-- La app limita acciones financieras por rol; RLS bloquea a usuarios no autorizados.
create policy reservas_panel_update
  on public.reservas
  for update
  to authenticated
  using (public.is_panel_user())
  with check (public.is_panel_user());

-- No se crea politica DELETE directa.
-- La eliminacion debe pasar por public.eliminar_reserva_con_motivo().

grant insert on table public.reservas to anon;
grant select, insert, update on table public.reservas to authenticated;

-- =========================================================
-- 6. Resumen manual de roles
-- =========================================================

-- anon:
-- - Puede insertar reservas publicas pendientes.
-- - No puede hacer SELECT directo a public.reservas.
-- - Puede ejecutar public.obtener_reservas_disponibilidad().
-- - No puede UPDATE ni DELETE.
--
-- authenticated admin/empleado en admin_users:
-- - Puede SELECT/INSERT/UPDATE en public.reservas.
-- - Puede ejecutar public.eliminar_reserva_con_motivo().
--
-- admin:
-- - Puede ver public.reservas_eliminadas.
--
-- empleado:
-- - Puede eliminar con motivo por RPC.
-- - No ve historial completo de eliminadas por politica RLS.
--
-- authenticated no autorizado:
-- - No puede SELECT/INSERT/UPDATE/DELETE en public.reservas.
-- - No puede ejecutar acciones utiles del panel porque las funciones validan admin_users.

-- Ejemplos para asignar roles despues de crear usuarios en Supabase Auth:
--
-- insert into public.admin_users (user_id, email, rol)
-- select id, email, 'admin'
-- from auth.users
-- where lower(email) = lower('admin@refugiolarboleda.com')
-- on conflict (email) do update
-- set user_id = excluded.user_id,
--     rol = excluded.rol;
--
-- insert into public.admin_users (user_id, email, rol)
-- select id, email, 'empleado'
-- from auth.users
-- where lower(email) = lower('empleado@refugiolarboleda.com')
-- on conflict (email) do update
-- set user_id = excluded.user_id,
--     rol = excluded.rol;
