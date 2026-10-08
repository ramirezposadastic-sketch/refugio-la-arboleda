import { FiUser, FiHome, FiUsers, FiCreditCard, FiFileText } from "react-icons/fi";

function InfoRow({ label, children }) {
  return <div className="admin-detail-row"><dt>{label}</dt><dd>{children ?? "No registrado"}</dd></div>;
}

export default function AdminReservationDetail({ reserva: r, format, payment, actions, detailRef }) {
  if (!r) return <aside className="admin-reservation-detail admin-detail-empty"><FiFileText aria-hidden="true" /><h3>Detalle de reserva</h3><p>Selecciona una reserva del listado para consultar su información.</p></aside>;
  return (
    <aside ref={detailRef} className="admin-reservation-detail" aria-labelledby="admin-detail-title" tabIndex={-1}>
      <header className="admin-detail-header">
        <span className="admin-client-avatar" aria-hidden="true">{(r.nombre || "?").trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>
        <div><h3 id="admin-detail-title">{r.nombre || "Sin nombre"}</h3><p>{r.celular || "Sin celular"}</p><span className={`estado ${format.normalizarEstado(r.estado)}`}>{r.estado}</span></div>
        <small className="admin-detail-id">Reserva #{r.id}{r.created_at && <span>Creada: {format.fechaHoraLegible(r.created_at)}</span>}</small>
      </header>
      <div className="admin-detail-grid">
        <section className="admin-detail-card"><h4><FiUser aria-hidden="true" />Información del cliente</h4><dl>
          <InfoRow label="Nombre">{r.nombre}</InfoRow><InfoRow label="Celular">{r.celular}</InfoRow><InfoRow label="Correo">{r.correo || "No registrado"}</InfoRow>
          <InfoRow label="Identificación">{r.identificacion || "No registrada"}</InfoRow>
          {r.ocupacion && <InfoRow label="Ocupación">{r.ocupacion}</InfoRow>}{r.residencia && <InfoRow label="Residencia">{r.residencia}</InfoRow>}
        </dl></section>
        <section className="admin-detail-card"><h4><FiHome aria-hidden="true" />Estadía</h4><dl>
          <InfoRow label="Cabaña">{format.normalizarCabana(r.cabana)}</InfoRow><InfoRow label="Ingreso">{format.fechaLegible(r.fecha_ingreso)}</InfoRow><InfoRow label="Salida">{format.fechaLegible(r.fecha_salida)}</InfoRow><InfoRow label="Noches">{format.calcularNoches(r.fecha_ingreso, r.fecha_salida)}</InfoRow>
        </dl></section>
        <section className="admin-detail-card"><h4><FiUsers aria-hidden="true" />Huéspedes</h4><dl>
          <InfoRow label="Personas">{format.personasReserva(r)}</InfoRow><InfoRow label="Adultos">{format.adultosReserva(r)}</InfoRow><InfoRow label="Niños menores">{format.ninosReserva(r)}</InfoRow>
        </dl></section>
        <section className="admin-detail-card"><h4><FiCreditCard aria-hidden="true" />Valores</h4><dl>
          <InfoRow label="Total">${format.formatoMoneda(format.valorTotal(r))}</InfoRow><InfoRow label="Anticipo registrado">${format.formatoMoneda(format.valorAnticipo(r))}</InfoRow><InfoRow label="Saldo pendiente">${format.formatoMoneda(format.valorSaldo(r))}</InfoRow>
        </dl></section>
        <section className="admin-detail-card admin-detail-wide"><h4><FiFileText aria-hidden="true" />Observaciones</h4><p className="admin-detail-note">{r.observaciones?.trim() || "Sin observaciones"}</p></section>
        <section className="admin-detail-card admin-detail-wide"><h4><FiCreditCard aria-hidden="true" />Estado de pago</h4>{payment}</section>
      </div>
      <div className="admin-detail-actions">{actions}</div>
    </aside>
  );
}
