import { useEffect, useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { supabase } from "../supabase";
import {
  CABANAS,
  asignarPrimeraCabanaDisponible,
  calcularTarifaReserva,
  fechaEstaLlena,
  fechaOcupadaPorCabana,
  fechaToISO,
  formatoMoneda,
  obtenerCabanasDisponibles,
  rangoDisponible,
} from "../lib/reservas";

registerLocale("es", es);

function Reservas() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [residencia, setResidencia] = useState("");
  const [ingreso, setIngreso] = useState(null);
  const [salida, setSalida] = useState(null);
  const [adultos, setAdultos] = useState("2");
  const [ninosMenores, setNinosMenores] = useState("0");
  const [cabana, setCabana] = useState("");
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarReservas = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id, cabana, fecha_ingreso, fecha_salida, estado");

      if (error) {
        console.error(error);
        return;
      }

      setReservas(data || []);
    };

    cargarReservas();
  }, []);

  const tarifa = calcularTarifaReserva({
    adultos,
    ninosMenores,
    fechaIngreso: ingreso,
    fechaSalida: salida,
  });

  const cabanasDisponibles = useMemo(
    () =>
      obtenerCabanasDisponibles({
        reservas,
        fechaIngreso: ingreso,
        fechaSalida: salida,
      }),
    [reservas, ingreso, salida],
  );

  const rangoOk = rangoDisponible({
    reservas,
    fechaIngreso: ingreso,
    fechaSalida: salida,
    cabana,
  });

  const reservaOk = tarifa.noches > 0 && tarifa.noches <= 3 && rangoOk;

  const handleIngresoChange = (date) => {
    setIngreso(date);
    if (salida && date && salida <= date) setSalida(null);
  };

  const fechaDisponibleIngreso = (date) => {
    if (cabana) return !fechaOcupadaPorCabana(reservas, date, cabana);
    return !fechaEstaLlena(reservas, date);
  };

  const fechaDisponibleSalida = (date) => {
    if (!ingreso || date <= ingreso) return false;
    return rangoDisponible({
      reservas,
      fechaIngreso: ingreso,
      fechaSalida: date,
      cabana,
    });
  };

  const claseDia = (date) => {
    if (cabana && fechaOcupadaPorCabana(reservas, date, cabana)) return "dia-ocupado";
    if (!cabana && fechaEstaLlena(reservas, date)) return "dia-ocupado";
    return "dia-disponible";
  };

  const enviarWhatsApp = async () => {
    if (!nombre || !identificacion || !ocupacion || !residencia || !correo || !celular || !ingreso || !salida) {
      alert("Por favor completa todos los campos.");
      return;
    }

    if (tarifa.noches > 3) {
      alert("Para reservas superiores a 3 noches comunicate directamente con nuestro WhatsApp.");
      return;
    }

    const cabanaAsignada = asignarPrimeraCabanaDisponible({
      reservas,
      fechaIngreso: ingreso,
      fechaSalida: salida,
      cabanaPreferida: cabana,
    });

    if (!cabanaAsignada) {
      alert("No hay cabañas disponibles para esas fechas. Prueba con otro rango.");
      return;
    }

    setCargando(true);

    try {
      const { error } = await supabase.from("reservas").insert([
        {
          nombre,
          correo,
          celular,
          identificacion,
          ocupacion,
          residencia,
          cabana: cabanaAsignada,
          fecha_ingreso: fechaToISO(ingreso),
          fecha_salida: fechaToISO(salida),
          adultos: tarifa.adultos,
          ninos_menores: tarifa.ninosMenores,
          personas: tarifa.personas,
          tipo_reserva: tarifa.tipoReserva,
          anticipo: tarifa.anticipo,
          total: tarifa.total,
          saldo_pendiente: tarifa.saldoPendiente,
          estado: "Pendiente",
          pago_confirmado: false,
        },
      ]);

      if (error) {
        alert(error.message || "No se pudo guardar. Intenta de nuevo.");
        return;
      }

      const fmt = (d) => d?.toLocaleDateString("es-CO");
      const mensaje = `
REFUGIO LA ARBOLEDA - SOLICITUD DE RESERVA

Nombre: ${nombre}
Celular: ${celular}
Cabaña: ${cabanaAsignada}
Fecha ingreso: ${fmt(ingreso)}
Fecha salida: ${fmt(salida)}
Noches: ${tarifa.noches}
Adultos: ${tarifa.adultos}
Niños menores de 8 años: ${tarifa.ninosMenores}
Total: $${formatoMoneda(tarifa.total)}
Anticipo 40%: $${formatoMoneda(tarifa.anticipo)}
Saldo pendiente al llegar: $${formatoMoneda(tarifa.saldoPendiente)}
      `.trim();

      window.open(`https://wa.me/573136303649?text=${encodeURIComponent(mensaje)}`, "_blank");
    } catch (e) {
      console.error(e);
      alert("Error de conexion.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <section id="reservas" className="reservas">
      <h2>Reserva tu Experiencia</h2>

      <form className="reserva-form" onSubmit={(e) => e.preventDefault()}>
        <input type="text" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input type="text" placeholder="Numero de identificacion" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} />
        <input type="text" placeholder="Ocupacion" value={ocupacion} onChange={(e) => setOcupacion(e.target.value)} />
        <input type="text" placeholder="Residencia" value={residencia} onChange={(e) => setResidencia(e.target.value)} />
        <input type="email" placeholder="Correo electronico" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input type="text" placeholder="Celular" value={celular} onChange={(e) => setCelular(e.target.value)} />

        <div className="fechas-grid">
          <div>
            <label>Fecha de ingreso</label>
            <DatePicker
              selected={ingreso}
              onChange={handleIngresoChange}
              dateFormat="dd/MM/yyyy"
              placeholderText="Ingreso"
              minDate={new Date()}
              className="datepicker"
              filterDate={fechaDisponibleIngreso}
              locale="es"
              showPopperArrow={false}
              fixedHeight
              dayClassName={claseDia}
            />
          </div>

          <div>
            <label>Fecha de salida</label>
            <DatePicker
              selected={salida}
              onChange={(d) => setSalida(d)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Salida"
              minDate={ingreso ? new Date(ingreso.getTime() + 86400000) : new Date()}
              className="datepicker"
              filterDate={fechaDisponibleSalida}
              disabled={!ingreso}
              locale="es"
              showPopperArrow={false}
              fixedHeight
              dayClassName={claseDia}
            />
          </div>

          <div className="cabana-box">
            <label>Selecciona tu cabaña</label>
            <select className="cabana-select" value={cabana} onChange={(e) => setCabana(e.target.value)}>
              <option value="">Asignacion automatica</option>
              {CABANAS.map((item) => (
                <option key={item} value={item} disabled={ingreso && salida && !cabanasDisponibles.includes(item)}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {ingreso && salida && (
          <div className={rangoOk ? "disponibilidad-ok" : "mensaje-error"}>
            {rangoOk
              ? `Disponibles: ${cabanasDisponibles.join(", ")}`
              : "No hay disponibilidad para esas fechas y cabaña."}
          </div>
        )}

        <div className="huespedes-grid">
          <label>
            Adultos
            <input type="number" min="1" value={adultos} onChange={(e) => setAdultos(e.target.value)} />
          </label>
          <label>
            Niños menores de 8 años
            <input type="number" min="0" value={ninosMenores} onChange={(e) => setNinosMenores(e.target.value)} />
          </label>
        </div>

        <div className="tipo-reserva-auto">
          Tipo de tarifa: <strong>{tarifa.tipoReserva}</strong>
        </div>

        <div className="precio-reserva">
          <h2>Resumen de Reserva</h2>
          <div className="linea-resumen"><span>Cabaña seleccionada</span><span>{cabana || "Asignacion automatica"}</span></div>
          <div className="linea-resumen"><span>Fecha ingreso</span><span>{ingreso ? ingreso.toLocaleDateString("es-CO") : "-"}</span></div>
          <div className="linea-resumen"><span>Fecha salida</span><span>{salida ? salida.toLocaleDateString("es-CO") : "-"}</span></div>
          <div className="linea-resumen"><span>Noches</span><span>{tarifa.noches}</span></div>
          <div className="linea-resumen"><span>Adultos</span><span>{tarifa.adultos}</span></div>
          <div className="linea-resumen"><span>Niños menores</span><span>{tarifa.ninosMenores}</span></div>
          <hr />
          {tarifa.desglose.map((item) => (
            <div className="linea-resumen" key={item.label}>
              <span>{item.label}</span>
              <span>${formatoMoneda(item.valor)}</span>
            </div>
          ))}
          {tarifa.noches > 1 && (
            <div className="linea-resumen"><span>Valor por noche</span><span>${formatoMoneda(tarifa.valorNoche)}</span></div>
          )}
          <hr />
          <div className="linea-total"><span>Total</span><span>${formatoMoneda(tarifa.total)}</span></div>
          <div className="linea-anticipo"><span>Anticipo 40%</span><span>${formatoMoneda(tarifa.anticipo)}</span></div>
          <div className="linea-saldo"><span>Saldo pendiente</span><span>${formatoMoneda(tarifa.saldoPendiente)}</span></div>
        </div>

        {tarifa.noches > 3 && (
          <div className="mensaje-error">
            Para reservas superiores a 3 noches comunicate directamente con nuestro WhatsApp.
          </div>
        )}

        <button type="button" onClick={enviarWhatsApp} disabled={!reservaOk || cargando}>
          {cargando ? "Guardando..." : "Reservar por WhatsApp"}
        </button>

        <p>Para confirmar la reserva se solicita un anticipo del 40%.</p>
      </form>
    </section>
  );
}

export default Reservas;
