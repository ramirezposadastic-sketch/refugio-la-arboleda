-- Roles y auditoria Admin - Refugio La Arboleda
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- Este archivo NO se ejecuta desde la app.

-- 1. Mantener/crear tabla de usuarios autorizados.
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

-- Ejemplos para configurar roles manualmente:
-- Admin:
-- update public.admin_users
-- set rol = 'admin'
-- where lower(email) = lower('correo@gmail.com');
--
-- Empleado:
-- update public.admin_users
-- set rol = 'empleado'
-- where lower(email) = lower('correo@gmail.com');

-- 2. Helpers de permisos.
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

-- Compatibilidad con politicas anteriores que llaman public.is_admin().
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_panel_user();
$$;

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

-- 3. Tabla de auditoria de reservas eliminadas.
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

-- 4. RPC: eliminacion logica con motivo obligatorio.
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

grant execute on function public.eliminar_reserva_con_motivo(bigint, text)
  to authenticated;

-- 5. Politicas recomendadas para reservas con roles.
-- No elimina politicas publicas existentes del calendario/reservas.
-- Si ya tienes politicas admin creadas, puedes reemplazarlas por estas:
--
-- drop policy if exists reservas_admin_select on public.reservas;
-- create policy reservas_admin_select
--   on public.reservas
--   for select
--   to authenticated
--   using (public.is_panel_user());
--
-- drop policy if exists reservas_admin_insert on public.reservas;
-- create policy reservas_admin_insert
--   on public.reservas
--   for insert
--   to authenticated
--   with check (public.is_panel_user());
--
-- drop policy if exists reservas_admin_update on public.reservas;
-- create policy reservas_admin_update
--   on public.reservas
--   for update
--   to authenticated
--   using (public.is_panel_user())
--   with check (public.is_panel_user());
--
-- Nota: la app ya bloquea acciones por rol en la UI y antes de ejecutar funciones.
-- La RPC tambien valida que quien elimina sea admin o empleado.
