-- Gestion de fotos del sitio Refugio La Arboleda.
-- Ejecutar en Supabase SQL Editor. No incluye llaves privadas.

create table if not exists public.fotos_sitio (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  categoria text not null check (categoria in ('hero', 'cabanas', 'galeria', 'actividades', 'rio', 'zonas', 'exterior', 'interior')),
  url text not null,
  storage_path text,
  activa boolean not null default true,
  orden int not null default 0,
  es_principal boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.fotos_sitio enable row level security;

create or replace function public.actualizar_fecha_fotos_sitio()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists fotos_sitio_actualizado_en on public.fotos_sitio;
create trigger fotos_sitio_actualizado_en
before update on public.fotos_sitio
for each row
execute function public.actualizar_fecha_fotos_sitio();

drop policy if exists "Publico lee fotos activas" on public.fotos_sitio;
create policy "Publico lee fotos activas"
on public.fotos_sitio
for select
to anon, authenticated
using (activa = true);

drop policy if exists "Admins gestionan fotos" on public.fotos_sitio;
create policy "Admins gestionan fotos"
on public.fotos_sitio
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where (au.user_id = auth.uid() or lower(au.email) = lower(auth.jwt() ->> 'email'))
      and coalesce(au.rol, 'admin') = 'admin'
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where (au.user_id = auth.uid() or lower(au.email) = lower(auth.jwt() ->> 'email'))
      and coalesce(au.rol, 'admin') = 'admin'
  )
);

-- Storage recomendado:
-- 1. Crear bucket publico: imagenes-refugio
-- 2. Permitir lectura publica de objetos del bucket.
-- 3. Permitir insert/update/delete solo a usuarios admin autorizados.
-- Las politicas exactas de storage pueden variar segun la configuracion del proyecto.
