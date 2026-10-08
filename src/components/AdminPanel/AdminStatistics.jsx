import { useMemo } from "react";
import { FiCalendar, FiFileText, FiCheck, FiX } from "react-icons/fi";
import { calcularEstadisticasReservas, nombreMesEstadisticas } from "./reservationStatistics.js";
import "./AdminStatistics.css";

function Conteos({ titulo, filas, total }) {
  return <section className="admin-statistics-block" aria-label={titulo}>
    <h4>{titulo}</h4>
    <table><caption className="admin-sr-only">{titulo}</caption><thead className="admin-sr-only"><tr><th scope="col">Grupo</th><th scope="col">Reservas</th></tr></thead>
      <tbody>{filas.map(([nombre, conteo]) => <tr key={nombre}><th scope="row">{nombre}</th><td>{conteo}</td></tr>)}</tbody>
      <tfoot><tr><th scope="row">Total filtrado</th><td>{total}</td></tr></tfoot>
    </table>
    {filas.length === 0 && <p className="admin-statistics-empty">No hay reservas que coincidan con los filtros.</p>}
  </section>;
}

export default function AdminStatistics({ reservas, mesActual, periodo, filtros }) {
  const datos = useMemo(() => calcularEstadisticasReservas(reservas), [reservas]);
  const periodoLegible = periodo.charAt(0).toUpperCase() + periodo.slice(1);
  const contexto = [periodoLegible,
    filtros.cabana === "Todas" ? "Todas las cabañas" : filtros.cabana,
    filtros.estado === "Todas" ? "Todos los estados" : filtros.estado,
    filtros.pago === "Todos" ? "Todos los pagos" : filtros.pago];

  return <section id="admin-estadisticas" className="admin-statistics" aria-labelledby="admin-statistics-title">
    <header className="admin-statistics-header">
      <h3 id="admin-statistics-title">Estadísticas de reservas</h3>
      <p className="admin-statistics-context">Mostrando: <span>{contexto.join(" · ")}</span></p>
      {filtros.busqueda.trim() && <p className="admin-statistics-search">Búsqueda: {filtros.busqueda.trim()}</p>}
      <p className="admin-statistics-date">Periodo y meses según fecha de ingreso.</p>
    </header>
    <dl className="admin-statistics-summary" aria-label="Resumen de reservas filtradas">
      <div className="admin-statistics-total"><dt><FiCalendar aria-hidden="true" />Total reservas</dt><dd>{datos.total}</dd></div>
      <div className="admin-statistics-pending"><dt><FiFileText aria-hidden="true" />Pendientes</dt><dd>{datos.estados.pendiente}</dd></div>
      <div className="admin-statistics-confirmed"><dt><FiCheck aria-hidden="true" />Confirmadas</dt><dd>{datos.estados.confirmada}</dd></div>
      <div className="admin-statistics-cancelled"><dt><FiX aria-hidden="true" />Canceladas</dt><dd>{datos.estados.cancelada}</dd></div>
    </dl>
    <div className="admin-statistics-grid">
      <Conteos titulo={mesActual ? "Reservas del periodo" : "Reservas por mes"}
        filas={mesActual ? [[periodoLegible, datos.total]] : datos.porMes.map(([mes, total]) => [nombreMesEstadisticas(mes), total])} total={datos.total} />
      <Conteos titulo="Reservas por cabaña" filas={datos.porCabana} total={datos.total} />
    </div>
  </section>;
}
