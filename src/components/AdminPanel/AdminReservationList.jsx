import { FiChevronRight, FiCalendar } from "react-icons/fi";

export default function AdminReservationList({ reservas, selectedId, onSelect, format, total = reservas.length, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const start = total === 0 ? 0 : page ? (page - 1) * pageSize + 1 : 1;
  const end = total === 0 ? 0 : start + reservas.length - 1;
  return (
    <div className="admin-reservation-list" role="group" aria-label="Listado de reservas">
      <div className="admin-record-columns" aria-hidden="true">
        <span>Cliente</span><span>Cabaña</span><span>Ingreso / salida</span><span>Noches</span><span>Personas</span><span>Total</span><span>Estado</span>
      </div>
      <ul className="admin-records">
        {reservas.map((r) => (
          <li key={r.id}>
            <button type="button" className={`admin-record ${r.id === selectedId ? "is-selected" : ""}`} aria-pressed={r.id === selectedId} onClick={() => onSelect(r.id)}>
              <span className="admin-record-client"><span className="admin-client-avatar" aria-hidden="true">{(r.nombre || "?").trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span><span><strong>{r.nombre || "Sin nombre"}</strong><small>{r.celular || "Sin celular"}</small></span></span>
              <span><small className="admin-cell-label">Cabaña</small>{format.normalizarCabana(r.cabana)}</span>
              <span className="admin-record-dates"><small className="admin-cell-label"><FiCalendar aria-hidden="true" />Fechas</small><span>{format.fechaLegible(r.fecha_ingreso)}</span><span>{format.fechaLegible(r.fecha_salida)}</span></span>
              <span><small className="admin-cell-label">Noches</small>{format.calcularNoches(r.fecha_ingreso, r.fecha_salida)}</span>
              <span><small className="admin-cell-label">Personas</small>{format.personasReserva(r)}</span>
              <span className="admin-record-total"><small className="admin-cell-label">Total</small>${format.formatoMoneda(format.valorTotal(r))}</span>
              <span className="admin-record-status"><span className={`estado ${format.normalizarEstado(r.estado)}`}>{r.estado}</span><FiChevronRight aria-hidden="true" /></span>
            </button>
          </li>
        ))}
      </ul>
      {reservas.length === 0 && <p className="admin-list-empty" role="status">No hay reservas que coincidan con los filtros.</p>}
      <footer className="admin-list-footer">
        <p className="admin-list-count" role="status" aria-live="polite">Mostrando {start}–{end} de {total} reservas</p>
        {page && <>
          <nav className="admin-pagination" aria-label="Paginación de reservas">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
            {pages.map((n, index) => <span className="admin-pagination-item" key={n}>
              {index > 0 && n - pages[index - 1] > 1 && <span className="admin-pagination-gap" aria-hidden="true">…</span>}
              <button type="button" aria-label={`Página ${n}`} aria-current={page === n ? "page" : undefined} onClick={() => onPageChange(n)}>{n}</button>
            </span>)}
            <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
          </nav>
          <label className="admin-page-size">Por página
            <select aria-label="Reservas por página" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </>}
      </footer>
    </div>
  );
}
