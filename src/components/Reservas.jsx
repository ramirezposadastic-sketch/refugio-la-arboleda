import { supabase } from "../supabase";
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";

registerLocale("es", es);

const ESTADOS_QUE_BLOQUEAN = ["Pendiente", "Confirmada"];

const formatFechaLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseFechaLocal = (fecha) => {
  if (!fecha) return null;
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const sumarDias = (date, dias) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + dias);

const fechaLocalTime = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const seCruzanRangos = (inicioA, salidaA, inicioB, salidaB) =>
  fechaLocalTime(inicioA) < fechaLocalTime(salidaB) &&
  fechaLocalTime(inicioB) < fechaLocalTime(salidaA);

function Reservas() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [residencia, setResidencia] = useState("");
  const [ingreso, setIngreso] = useState(null);
  const [salida, setSalida] = useState(null);
  const [personas, setPersonas] = useState("1");
  const [cabana, setCabana] = useState("");
  const [reservasBloqueantes, setReservasBloqueantes] = useState([]);
  const [cargando, setCargando] = useState(false);

  const fechaEstaOcupada = (date) =>
    reservasBloqueantes.some((r) => {
      const inicio = parseFechaLocal(r.fecha_ingreso);
      const fin = parseFechaLocal(r.fecha_salida);
      return (
        inicio &&
        fin &&
        fechaLocalTime(date) >= fechaLocalTime(inicio) &&
        fechaLocalTime(date) < fechaLocalTime(fin)
      );
    });

  const rangoEstaOcupado = (inicio, fin) =>
    reservasBloqueantes.some((r) => {
      const reservaInicio = parseFechaLocal(r.fecha_ingreso);
      const reservaFin = parseFechaLocal(r.fecha_salida);
      return (
        reservaInicio &&
        reservaFin &&
        seCruzanRangos(inicio, fin, reservaInicio, reservaFin)
      );
    });

  useEffect(() => {
    if (!cabana) {
      return;
    }

    const cargarReservas = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("fecha_ingreso, fecha_salida, cabana, estado")
        .eq("cabana", cabana)
        .in("estado", ESTADOS_QUE_BLOQUEAN);
      if (error) { console.error(error); return; }
      setReservasBloqueantes(data || []);
    };
    cargarReservas();
  }, [cabana]);

  let noches = 0;
  if (ingreso && salida) {
    noches = Math.ceil((salida - ingreso) / (1000 * 60 * 60 * 24));
  }

  let valorNoche = 0;
  const p = parseInt(personas, 10);
  let tipoReserva = "semana";

if (ingreso) {
  const dia = ingreso.getDay();

  if (dia === 5 || dia === 6 || dia === 0) {
    tipoReserva = "festivo";
  }
}

  if (tipoReserva === "semana") {
    if (p === 1) valorNoche = 300000;
    else if (p === 2) valorNoche = 420000;
    else if (p === 3) valorNoche = 600000;
    else if (p === 4) valorNoche = 780000;
  } else {
    if (p === 1) valorNoche = 600000;
    else if (p === 2) valorNoche = 650000;
    else if (p === 3) valorNoche = 890000;
    else if (p === 4) valorNoche = 1130000;
  }

  const descuentoPct = noches === 2 ? 10 : noches === 3 ? 15 : 0;
  const subtotal     = valorNoche * (noches > 0 ? noches : 1);
  const descuentoVal = subtotal * (descuentoPct / 100);
  const totalFinal   = subtotal - descuentoVal;
  const anticipo     = totalFinal / 2;
  const reservaOk    = Boolean(cabana) && noches > 0 && noches <= 3;

  const handleIngresoChange = (date) => {
    setIngreso(date);
    if (salida && date && (salida <= date || rangoEstaOcupado(date, salida))) {
      setSalida(null);
    }
  };

  const enviarWhatsApp = async () => {
    if (!nombre || !identificacion || !ocupacion || !residencia || !cabana ||
        !correo  || !celular       || !ingreso   || !salida) {
      alert("Por favor completa todos los campos.");
      return;
    }
    if (noches > 3) {
      alert("Para reservas superiores a 3 noches comunícate directamente con nuestro WhatsApp.");
      return;
    }
    if (rangoEstaOcupado(ingreso, salida)) {
      alert("La cabaña seleccionada no está disponible en ese rango de fechas.");
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.from("reservas").insert([{
        nombre, correo, celular, identificacion, ocupacion, residencia, cabana,
        fecha_ingreso: formatFechaLocal(ingreso),
        fecha_salida:  formatFechaLocal(salida),
        personas: p,
        tipo_reserva: tipoReserva === "semana" ? "Entre semana" : "Fin de semana / Festivo",
        anticipo,
        total: totalFinal,
        estado: "Pendiente",
      }]);
      if (error) { alert("No se pudo guardar. Intenta de nuevo."); return; }
    } catch {
      alert("Error de conexión."); return;
    } finally {
      setCargando(false);
    }

    const fmt       = (d) => d?.toLocaleDateString("es-CO");
    const tipoLabel = tipoReserva === "semana" ? "Entre semana" : "Fin de semana / Festivo";

    const mensaje = `
REFUGIO LA ARBOLEDA - SOLICITUD DE RESERVA

DATOS DEL HUÉSPED
Nombre: ${nombre}
Identificación: ${identificacion}
Ocupación: ${ocupacion}
Residencia: ${residencia}
Cabaña: ${cabana}
Correo: ${correo}
Celular: ${celular}

DETALLES
Fecha ingreso: ${fmt(ingreso)}
Fecha salida: ${fmt(salida)}
Personas: ${p}
Tipo: ${tipoLabel}
Noches: ${noches}

VALORES
Valor por noche: $${valorNoche.toLocaleString("es-CO")}
Subtotal: $${subtotal.toLocaleString("es-CO")}
Descuento: ${descuentoPct}% (-$${descuentoVal.toLocaleString("es-CO")})
Total: $${totalFinal.toLocaleString("es-CO")}
Anticipo (50%): $${anticipo.toLocaleString("es-CO")}

La reserva se confirma con el pago del anticipo del 50%.
    `.trim();

    window.open(`https://wa.me/573136303649?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  return (
    <section id="reservas" className="reservas">
      <h2>Reserva tu Experiencia</h2>

      <form className="reserva-form" onSubmit={(e) => e.preventDefault()}>

        <input type="text"  placeholder="Nombre Completo"          value={nombre}         onChange={(e) => setNombre(e.target.value)} />
        <input type="text"  placeholder="Número de Identificación" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} />
        <input type="text"  placeholder="Ocupación"                value={ocupacion}      onChange={(e) => setOcupacion(e.target.value)} />
        <input type="text"  placeholder="Residencia"               value={residencia}     onChange={(e) => setResidencia(e.target.value)} />
        <input type="email" placeholder="Correo Electrónico"       value={correo}         onChange={(e) => setCorreo(e.target.value)} />
        <input type="text"  placeholder="Celular"                  value={celular}        onChange={(e) => setCelular(e.target.value)} />

        <div className="cabana-box">
          <label>🏡 Selecciona tu cabaña</label>

          <select
            className="cabana-select"
            value={cabana}
            onChange={(e) => {
              setCabana(e.target.value);
              setIngreso(null);
              setSalida(null);
            }}
          >
            <option value="">Selecciona una cabaña</option>
            <option value="Cabaña 1">🏡 Cabaña 1</option>
            <option value="Cabaña 2">🏡 Cabaña 2</option>
            <option value="Cabaña 3">🏡 Cabaña 3</option>
          </select>
        </div>

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
              filterDate={(date) => !fechaEstaOcupada(date)}
              disabled={!cabana}
              locale="es"
              showPopperArrow={false}
              fixedHeight
              dayClassName={(date) =>
                fechaEstaOcupada(date) ? "dia-ocupado" : "dia-disponible"
              }
              renderDayContents={(day, date) => (
                <span title={fechaEstaOcupada(date) ? "Fecha ocupada" : ""}>
                  {day}
                </span>
              )}
            />
          </div>
          <div>
            <label>Fecha de salida</label>
            <DatePicker
              selected={salida}
              onChange={(d) => setSalida(d)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Salida"
              minDate={
                ingreso
                  ? sumarDias(ingreso, 1)
                  : new Date()
              }
              className="datepicker"
              filterDate={(date) =>
                (!ingreso || !rangoEstaOcupado(ingreso, date))
              }
              disabled={!cabana || !ingreso}
              locale="es"
              showPopperArrow={false}
              fixedHeight
              dayClassName={(date) =>
                ingreso && rangoEstaOcupado(ingreso, date) ? "dia-ocupado" : ""
              }
              renderDayContents={(day, date) => (
                <span title={ingreso && rangoEstaOcupado(ingreso, date) ? "Rango no disponible" : ""}>
                  {day}
                </span>
              )}
            />
          </div>
        </div>

        {noches > 0 && (
          <div className="info-noches"><strong>Noches:</strong> {noches}</div>
        )}

        <select value={personas} onChange={(e) => setPersonas(e.target.value)}>
          <option value="1">1 Persona</option>
          <option value="2">2 Personas</option>
          <option value="3">3 Personas</option>
          <option value="4">4 Personas</option>
        </select>
        <div className="tipo-reserva-auto">
  Tipo de tarifa:
  <strong>
    {tipoReserva === "semana"
      ? " Entre semana"
      : " Fin de semana / Festivo"}
  </strong>
</div>

        <div className="precio-reserva">
          <h2>Resumen de Reserva</h2>
          <div className="linea-resumen">
            <span>Valor por noche</span>
            <span>${valorNoche.toLocaleString("es-CO")}</span>
          </div>
          <div className="linea-resumen">
            <span>Noches</span>
            <span>{noches}</span>
          </div>
          <div className="linea-resumen">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString("es-CO")}</span>
          </div>
          <div className="linea-resumen">
            <span>Descuento</span>
            <span>{descuentoPct}%</span>
          </div>
          <div className="linea-resumen">
            <span>Ahorro</span>
            <span>${descuentoVal.toLocaleString("es-CO")}</span>
          </div>
          <hr />
          <div className="linea-total">
            <span>Total</span>
            <span>${totalFinal.toLocaleString("es-CO")}</span>
          </div>
          <div className="linea-anticipo">
            <span>Anticipo (50%)</span>
            <span>${anticipo.toLocaleString("es-CO")}</span>
          </div>
        </div>

        {noches > 3 && (
          <div className="mensaje-error">
            Para reservas superiores a 3 noches comunícate directamente con nuestro WhatsApp.
          </div>
        )}

        <button type="button" onClick={enviarWhatsApp} disabled={!reservaOk || cargando}>
          {cargando ? "Guardando..." : "Reservar por WhatsApp"}
        </button>

        <p>Para confirmar la reserva se solicita un anticipo del 50%.</p>
      </form>
    </section>
  );
}

export default Reservas;
