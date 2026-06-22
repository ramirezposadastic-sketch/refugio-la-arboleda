import { useEffect, useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { supabase } from "../supabase";
import {
  CABANAS,
  asignarPrimeraCabanaDisponible,
  calcularTarifaReserva,
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
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

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

  const rangoValidado = Boolean(cabana && ingreso && salida);
  const rangoDisponibleCompleto = Boolean(rangoValidado && rangoOk);
  const fechaIngresoTexto = ingreso ? ingreso.toLocaleDateString("es-CO") : "Pendiente";
  const fechaSalidaTexto = salida ? salida.toLocaleDateString("es-CO") : "Pendiente";
  const estadoDisponibilidad = !cabana
    ? "Selecciona una cabaña"
    : !ingreso
      ? "Selecciona fecha de ingreso"
      : !salida
        ? "Selecciona fecha de salida"
        : rangoOk
          ? "Disponible"
          : "No disponible";
  const mensajeDisponibilidad = !cabana
    ? "Primero selecciona una cabaña para ver sus fechas disponibles."
    : !ingreso
      ? "Luego selecciona la fecha de ingreso."
      : !salida
        ? "Selecciona la fecha de salida para validar el rango."
        : rangoOk
          ? "✅ Esta cabaña está disponible para las fechas seleccionadas."
          : "⚠️ Esta cabaña no está disponible para una o más fechas seleccionadas.";

  const handleCabanaChange = (event) => {
    const nuevaCabana = event.target.value;
    setCabana(nuevaCabana);
    if (!nuevaCabana) {
      setIngreso(null);
      setSalida(null);
    }
  };

  const handleIngresoChange = (date) => {
    setIngreso(date);
    if (salida && date && salida <= date) setSalida(null);
  };

  const fechaDisponibleIngreso = (date) => {
    if (!cabana) return false;
    return !fechaOcupadaPorCabana(reservas, date, cabana);
  };

  const fechaDisponibleSalida = (date) => {
    if (!cabana || !ingreso || date <= ingreso) return false;
    return rangoDisponible({
      reservas,
      fechaIngreso: ingreso,
      fechaSalida: date,
      cabana,
    });
  };

  const claseDia = (date) => {
    const clases = [];
    const isoDia = fechaToISO(date);

    if (!cabana) clases.push("dia-sin-cabana");
    if (cabana && fechaOcupadaPorCabana(reservas, date, cabana)) clases.push("dia-ocupado");
    if (ingreso && isoDia === fechaToISO(ingreso)) clases.push("dia-entrada");
    if (salida && isoDia === fechaToISO(salida)) clases.push("dia-salida");
    if (ingreso && salida && date > ingreso && date < salida) clases.push("dia-rango");

    if (clases.length === 0) clases.push("dia-disponible");
    return clases.join(" ");
  };

  const validarDatosContacto = () => {
    if (!nombre || !identificacion || !ocupacion || !residencia || !correo || !celular) {
      alert("Por favor completa todos los campos.");
      return false;
    }

    return true;
  };

  const validarDisponibilidad = () => {
    if (!cabana) {
      alert("Selecciona una cabaña antes de elegir fechas.");
      return false;
    }

    if (!ingreso) {
      alert("Selecciona la fecha de ingreso.");
      return false;
    }

    if (!salida) {
      alert("Selecciona la fecha de salida.");
      return false;
    }

    if (salida <= ingreso) {
      alert("La fecha de salida debe ser posterior a la fecha de ingreso.");
      return false;
    }

    if (!rangoOk) {
      alert("La cabaña seleccionada no está disponible en una o más fechas del rango.");
      return false;
    }

    return true;
  };

  const validarTerminos = () => {
    if (!aceptaTerminos) {
      alert("Debes aceptar los Términos y Condiciones para continuar con la reserva.");
      return false;
    }

    return true;
  };

  const consultarWhatsApp = () => {
    if (!validarDatosContacto()) return;
    if (!validarDisponibilidad()) return;
    if (!validarTerminos()) return;

    const fmt = (d) => d?.toLocaleDateString("es-CO");
    const mensaje = `
REFUGIO LA ARBOLEDA - COTIZACION ESPECIAL

Nombre: ${nombre}
Celular: ${celular}
Cabaña: ${cabana}
Fecha ingreso: ${fmt(ingreso)}
Fecha salida: ${fmt(salida)}
Noches: ${tarifa.noches}
Adultos: ${tarifa.adultos}
Niños menores de 8 años: ${tarifa.ninosMenores}

Solicito una cotización especial para una reserva de más de 3 noches.
El huésped acepta los Términos y Condiciones de Refugio La Arboleda.
    `.trim();

    window.open(`https://wa.me/573136303649?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const enviarWhatsApp = async () => {
    if (!validarDatosContacto()) return;
    if (!validarDisponibilidad()) return;
    if (!validarTerminos()) return;

    if (tarifa.reservaLarga) {
      consultarWhatsApp();
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
Subtotal: $${formatoMoneda(tarifa.subtotalSinDescuento)}
Descuento ${tarifa.descuentoPorcentaje}%: -$${formatoMoneda(tarifa.descuentoValor)}
Total: $${formatoMoneda(tarifa.total)}
Anticipo 40%: $${formatoMoneda(tarifa.anticipo)}
Saldo pendiente al llegar: $${formatoMoneda(tarifa.saldoPendiente)}
El huésped acepta los Términos y Condiciones de Refugio La Arboleda.
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

        <div className="cabana-box">
          <label>Selecciona tu cabaña</label>
          <select className="cabana-select" value={cabana} onChange={handleCabanaChange}>
            <option value="">Selecciona una cabaña</option>
            {CABANAS.map((item) => (
              <option key={item} value={item} disabled={Boolean(ingreso && salida && !cabanasDisponibles.includes(item))}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="calendario-ayuda">
          Elige tu cabaña y selecciona tus fechas. Te mostraremos si está disponible.
        </div>

        <div className="fechas-grid">
          <div>
            <label>Fecha de ingreso</label>
            <DatePicker
              selected={ingreso}
              onChange={handleIngresoChange}
              dateFormat="dd/MM/yyyy"
              placeholderText={cabana ? "Ingreso" : "Selecciona una cabaña"}
              minDate={new Date()}
              className="datepicker"
              filterDate={fechaDisponibleIngreso}
              disabled={!cabana}
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
              placeholderText={cabana ? "Salida" : "Selecciona una cabaña"}
              minDate={ingreso ? new Date(ingreso.getTime() + 86400000) : new Date()}
              className="datepicker"
              filterDate={fechaDisponibleSalida}
              disabled={!cabana || !ingreso}
              locale="es"
              showPopperArrow={false}
              fixedHeight
              dayClassName={claseDia}
            />
          </div>
        </div>

        <div className="calendario-leyenda" aria-label="Leyenda del calendario">
          <span><i className="leyenda-color disponible" />Disponible</span>
          <span><i className="leyenda-color ocupado" />Ocupado</span>
          <span><i className="leyenda-color seleccionado" />Seleccionado</span>
        </div>

        <div className={`resumen-disponibilidad ${rangoDisponibleCompleto ? "disponible" : "no-disponible"}`}>
          <div className="linea-resumen">
            <span>Cabaña seleccionada</span>
            <strong>{cabana || "Pendiente"}</strong>
          </div>
          <div className="linea-resumen">
            <span>Fechas seleccionadas</span>
            <strong>{fechaIngresoTexto} al {fechaSalidaTexto}</strong>
          </div>
          <div className="linea-resumen">
            <span>Noches</span>
            <strong>{tarifa.noches}</strong>
          </div>
          <div className="linea-resumen">
            <span>Estado</span>
            <strong>{estadoDisponibilidad}</strong>
          </div>
          {rangoValidado && <p>{mensajeDisponibilidad}</p>}
        </div>

        {rangoValidado && !rangoOk && (
          <div className="mensaje-error">
            La cabaña seleccionada no está disponible en una o más fechas del rango.
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
          <div className="linea-resumen"><span>Cabaña seleccionada</span><span>{cabana || "Pendiente"}</span></div>
          <div className="linea-resumen"><span>Fecha ingreso</span><span>{fechaIngresoTexto}</span></div>
          <div className="linea-resumen"><span>Fecha salida</span><span>{fechaSalidaTexto}</span></div>
          <div className="linea-resumen"><span>Adultos</span><span>{tarifa.adultos}</span></div>
          <div className="linea-resumen"><span>Niños menores</span><span>{tarifa.ninosMenores}</span></div>
          <hr />
          {tarifa.desglose.map((item) => (
            <div className="linea-resumen" key={item.label}>
              <span>{item.label}</span>
              <span>${formatoMoneda(item.valor)}</span>
            </div>
          ))}
          <hr />
          <div className="linea-resumen"><span>Valor por noche</span><span>${formatoMoneda(tarifa.valorNoche)}</span></div>
          <div className="linea-resumen"><span>Noches</span><span>{tarifa.noches}</span></div>
          <div className="linea-resumen"><span>Subtotal</span><span>${formatoMoneda(tarifa.subtotalSinDescuento)}</span></div>
          {tarifa.descuentoPorcentaje > 0 ? (
            <div className="linea-resumen">
              <span>Descuento aplicado {tarifa.descuentoPorcentaje}%</span>
              <span>-${formatoMoneda(tarifa.descuentoValor)}</span>
            </div>
          ) : (
            <div className="linea-resumen"><span>Descuento aplicado</span><span>$0</span></div>
          )}
          <hr />
          <div className="linea-total"><span>Total con descuento</span><span>${formatoMoneda(tarifa.total)}</span></div>
          <div className="linea-anticipo"><span>Anticipo 40%</span><span>${formatoMoneda(tarifa.anticipo)}</span></div>
          <div className="linea-saldo"><span>Saldo pendiente</span><span>${formatoMoneda(tarifa.saldoPendiente)}</span></div>
        </div>

        {tarifa.reservaLarga && (
          <div className="mensaje-error">
            Para reservas de más de 3 noches, comunícate directamente con el hotel por WhatsApp para recibir una tarifa especial.
          </div>
        )}

        <label className="terminos-check">
          <input
            type="checkbox"
            checked={aceptaTerminos}
            onChange={(e) => setAceptaTerminos(e.target.checked)}
          />
          <span>
            He leído y acepto los{" "}
            <a href="#terminos">Términos y Condiciones de Refugio La Arboleda.</a>
          </span>
        </label>

        {tarifa.reservaLarga ? (
          <button type="button" onClick={consultarWhatsApp} disabled={cargando}>
            Consultar por WhatsApp
          </button>
        ) : (
          <button type="button" onClick={enviarWhatsApp} disabled={cargando}>
            {cargando ? "Guardando..." : "Reservar por WhatsApp"}
          </button>
        )}

        <p>Para confirmar la reserva se solicita un anticipo del 40%.</p>
      </form>
    </section>
  );
}

export default Reservas;
