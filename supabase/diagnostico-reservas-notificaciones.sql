-- Solo lectura. Ejecutar manualmente; NO repara reservas antiguas.
select id, nombre, total, anticipo, saldo_pendiente,
       greatest(coalesce(total, 0) - coalesce(anticipo, 0), 0) as saldo_correcto
from public.reservas
where saldo_pendiente is distinct from greatest(coalesce(total, 0) - coalesce(anticipo, 0), 0)
   or total is null or total < 0 or anticipo < 0 or anticipo > total
order by id;

-- Verificar permisos reales antes de asumir que el SQL local esta aplicado.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('reservas', 'notificaciones_reserva');

select routine_name, routine_definition
from information_schema.routines
where routine_schema = 'public' and routine_name in ('is_panel_user', 'is_panel_admin');

select trigger_name, action_statement
from information_schema.triggers
where event_object_schema = 'public' and event_object_table = 'reservas';

select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'reservas';

select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'notificaciones_reserva'
order by ordinal_position;

select * from public.notificaciones_reserva order by creado_en desc limit 50;
