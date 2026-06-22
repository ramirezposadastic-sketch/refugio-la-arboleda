-- Seguridad Admin - Refugio La Arboleda
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- Este archivo NO se ejecuta desde la app.

-- 1. Tabla de usuarios autorizados para entrar al panel Admin.
create table if not exists public.admin_users (
  id bigserial primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_users_user_id_idx
  on public.admin_users(user_id);

create index if not exists admin_users_email_idx
  on public.admin_users(lower(email));

alter table public.admin_users enable row level security;

-- Permite que cada usuario autenticado consulte solo si su propio usuario
-- esta autorizado como admin. Esto permite la validacion visual en Admin.jsx.
drop policy if exists admin_users_read_own on public.admin_users;
create policy admin_users_read_own
  on public.admin_users
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 2. Helper para validar admins desde politicas RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 3. Politicas recomendadas para reservas.
-- Ajustar/ejecutar despues de revisar las politicas actuales del proyecto.
alter table public.reservas enable row level security;

-- La pagina publica puede crear solicitudes de reserva.
drop policy if exists reservas_public_insert on public.reservas;
create policy reservas_public_insert
  on public.reservas
  for insert
  to anon
  with check (true);

-- La pagina publica puede leer solo lo necesario para disponibilidad:
-- fechas, cabana y estado de reservas pendientes/confirmadas.
-- Nota: Supabase RLS no limita columnas; la app debe seguir seleccionando
-- solo id, cabana, fecha_ingreso, fecha_salida y estado en el calendario.
drop policy if exists reservas_public_calendar on public.reservas;
create policy reservas_public_calendar
  on public.reservas
  for select
  to anon
  using (lower(estado) in ('pendiente', 'confirmada'));

-- Admin autenticado y autorizado puede ver reservas.
drop policy if exists reservas_admin_select on public.reservas;
create policy reservas_admin_select
  on public.reservas
  for select
  to authenticated
  using (public.is_admin());

-- Admin autenticado y autorizado puede crear reservas manuales.
drop policy if exists reservas_admin_insert on public.reservas;
create policy reservas_admin_insert
  on public.reservas
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin autenticado y autorizado puede editar, confirmar, cancelar y marcar pagos.
drop policy if exists reservas_admin_update on public.reservas;
create policy reservas_admin_update
  on public.reservas
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin autenticado y autorizado puede eliminar reservas.
drop policy if exists reservas_admin_delete on public.reservas;
create policy reservas_admin_delete
  on public.reservas
  for delete
  to authenticated
  using (public.is_admin());

-- 4. Ejemplo para agregar tu usuario admin.
-- Primero crea el usuario en Supabase Auth.
-- Luego reemplaza el correo y ejecuta:
--
-- insert into public.admin_users (user_id, email)
-- select id, email
-- from auth.users
-- where lower(email) = lower('admin@refugiolarboleda.com')
-- on conflict (email) do update
-- set user_id = excluded.user_id;
