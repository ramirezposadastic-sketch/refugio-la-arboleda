import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { formatoMoneda } from "../lib/reservas";
import { formatearFechaReserva } from "../utils/fechas";

const ESTADOS_APROBADOS = ["aprobado", "approved", "pagado"];
const ESTADOS_RECHAZADOS = ["rechazado", "declined", "error", "voided"];

function normalizarEstadoPago(estado = "") {
  return estado.toString().trim().toLowerCase();
}

function ReservaPago() {
  const parametros = useMemo(() => new URLSearchParams(window.location.search), []);
  const reservaId = parametros.get("reserva_id") || "";
  const referencia = parametros.get("reference") || "";
  const [reserva, setReserva] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorConsulta, setErrorConsulta] = useState("");

  useEffect(() => {
    const cargarReserva = async () => {
      if (!reservaId) {
        setErrorConsulta("No encontramos el identificador de la reserva en el retorno del pago.");
        setCargando(false);
        return;
      }

      const { data, error } = await supabase
        .from("reservas")
        .select("id,nombre,cabana,fecha_ingreso,fecha_salida,anticipo,total,estado,pago_estado,pago_referencia,pago_monto,pago_moneda,pago_confirmado")
        .eq("id", reservaId)
        .maybeSingle();

      if (error) {
        console.error("No se pudo consultar el estado del pago:", error);
        setErrorConsulta("Tu pago quedó en verificación. Si el banco lo aprobó, el refugio recibirá la confirmación automáticamente.");
        setCargando(false);
        return;
      }

      setReserva(data || null);
      setCargando(false);
    };

    cargarReserva();
  }, [reservaId]);

  const estadoPago = normalizarEstadoPago(reserva?.pago_estado);
  const aprobado = reserva?.pago_confirmado || ESTADOS_APROBADOS.includes(estadoPago);
  const rechazado = ESTADOS_RECHAZADOS.includes(estadoPago);

  let titulo = "Pago en verificación";
  let descripcion = "Estamos esperando la confirmación automática de Wompi. Este proceso puede tardar unos minutos.";
  let claseEstado = "verificacion";

  if (aprobado) {
    titulo = "Pago aprobado";
    descripcion = "Recibimos la confirmación del anticipo. Tu reserva queda confirmada por Refugio La Arboleda.";
    claseEstado = "aprobado";
  } else if (rechazado) {
    titulo = "Pago no aprobado";
    descripcion = "Wompi no aprobó la transacción. Puedes intentar nuevamente o hablar con el refugio por WhatsApp.";
    claseEstado = "rechazado";
  }

  return (
    <main className="reserva-pago-page">
      <section className={`reserva-pago-card ${claseEstado}`}>
        <span className="reserva-pago-kicker">Refugio La Arboleda</span>
        <h1>{cargando ? "Consultando pago..." : titulo}</h1>
        <p>{cargando ? "Un momento mientras revisamos el estado de tu solicitud." : descripcion}</p>

        {!cargando && errorConsulta && <div className="reserva-pago-alerta">{errorConsulta}</div>}

        {!cargando && reserva && (
          <div className="reserva-pago-detalle">
            <div><span>Reserva</span><strong>#{reserva.id}</strong></div>
            <div><span>Cabaña</span><strong>{reserva.cabana || "Pendiente"}</strong></div>
            <div><span>Ingreso</span><strong>{formatearFechaReserva(reserva.fecha_ingreso)}</strong></div>
            <div><span>Salida</span><strong>{formatearFechaReserva(reserva.fecha_salida)}</strong></div>
            <div><span>Referencia Wompi</span><strong>{reserva.pago_referencia || referencia || "Pendiente"}</strong></div>
            <div><span>Anticipo</span><strong>${formatoMoneda(reserva.pago_monto || reserva.anticipo)}</strong></div>
          </div>
        )}

        <div className="reserva-pago-acciones">
          <a href="/#reservas" className="btn-volver-reserva">Volver a la web</a>
          <a href="https://wa.me/573136303649" target="_blank" rel="noopener noreferrer" className="btn-whatsapp-pago">
            Hablar por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}

export default ReservaPago;