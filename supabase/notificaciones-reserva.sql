-- Tabla de logs de notificaciones de reserva.
-- IMPORTANTE: public.reservas.id en este proyecto es bigint, por eso reserva_id tambien es bigint.
-- Si ya existe con reserva_id uuid, este script la recrea para corregir el tipo.

begin;

drop policy if exists "Admins leen logs de notificaciones" on public.notificaciones_reserva;
drop table if exists public.notificaciones_reserva;

create table public.notificaciones_reserva (
  id uuid primary key default gen_random_uuid(),
  reserva_id bigint references public.reservas(id) on delete set null,
  tipo text not null check (tipo in ('correo_refugio', 'correo_cliente')),
  destinatario text not null,
  estado text not null default 'pendiente' check (estado in ('enviado', 'error', 'pendiente')),
  error text,
  creado_en timestamptz not null default now()
);

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
    where au.user_id = auth.uid()
       or lower(au.email) = lower(auth.jwt() ->> 'email')
  )
);

-- La Edge Function escribe con SUPABASE_SERVICE_ROLE_KEY, por eso no se crea una policy publica de insert.

commit;
