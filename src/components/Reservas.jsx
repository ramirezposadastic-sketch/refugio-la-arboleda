import { supabase } from "../supabase";
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
  const [tipoReserva, setTipoReserva] = useState("semana");
  const [fechasOcupadas, setFechasOcupadas] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarReservas = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("fecha_ingreso, fecha_salida");
      if (error) { console.error(error); return; }
      const fechas = [];
      data.forEach(({ fecha_ingreso, fecha_salida }) => {
        const inicio = new Date(fecha_ingreso + "T00:00:00");
        const fin    = new Date(fecha_salida   + "T00:00:00");
        for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
          fechas.push(new Date(d));
        }
      });
      setFechasOcupadas(fechas);
    };
    cargarReservas();
  }, []);

  // ── Noches (directo, sin useMemo) ─────────────────────────────────
  let noches = 0;
  if (ingreso && salida) {
    noches = Math.ceil((salida - ingreso) / (1000 * 60 * 60 * 24));
  }

  // ── Tarifa (switch original que SÍ funcionaba) ─────────────────────
  let valorNoche = 0;
  const p = parseInt(personas, 10);

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

  // ── Totales ────────────────────────────────────────────────────────
  const descuentoPct = noches === 2 ? 10 : noches === 3 ? 15 : 0;
  const subtotal     = valorNoche * (noches > 0 ? noches : 1);
  const descuentoVal = subtotal * (descuentoPct / 100);
  const totalFinal   = subtotal - descuentoVal;
  const anticipo     = totalFinal / 2;
  const reservaOk    = noches > 0 && noches <= 3;

  const handleIngresoChange = (date) => {
    setIngreso(date);
    if (salida && date && salida <= date) setSalida(null);
  };

  const enviarWhatsApp = async () => {
    if (!nombre || !identificacion || !ocupacion || !residencia ||
        !correo  || !celular       || !ingreso   || !salida) {
      alert("Por favor completa todos los campos.");
      return;
    }
    if (noches > 3) {
      alert("Para reservas superiores a 3 noches comunícate directamente con nuestro WhatsApp.");
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.from("reservas").insert([{
        nombre, correo, celular, identificacion, ocupacion, residencia,
        fecha_ingreso: ingreso.toISOString().split("T")[0],
        fecha_salida:  salida.toISOString().split("T")[0],
        personas: p,
        tipo_reserva: tipoReserva === "semana" ? "Entre semana" : "Fin de semana / Festivo",
        anticipo,
        estado: "Pendiente",
      }]);
      if (error) { alert("No se pudo guardar. Intenta de nuevo."); return; }
    } catch (e) {
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
  console.log("personas =", personas);
  console.log("tipoReserva =", tipoReserva);
  console.log("valorNoche =", valorNoche);
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
  excludeDates={fechasOcupadas}
  dayClassName={(date) =>
    fechasOcupadas.some(
      (fecha) =>
        fecha.toDateString() === date.toDateString()
    )
      ? "dia-ocupado"
      : "dia-disponible"
  }
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
      ? new Date(ingreso.getTime() + 86400000)
      : new Date()
  }
  className="datepicker"
  excludeDates={fechasOcupadas}
  disabled={!ingreso}
  dayClassName={(date) =>
    fechasOcupadas.some(
      (fecha) =>
        fecha.toDateString() === date.toDateString()
    )
      ? "dia-ocupado"
      : "dia-disponible"
  }
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

        <select value={tipoReserva} onChange={(e) => setTipoReserva(e.target.value)}>
          <option value="semana">Entre semana</option>
          <option value="festivo">Fin de semana / Festivo</option>
        </select>

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