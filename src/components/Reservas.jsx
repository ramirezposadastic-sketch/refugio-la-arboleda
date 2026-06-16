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
  const [tipoReserva, setTipoReserva] = useState("Entre semana");
  const [fechasOcupadas, setFechasOcupadas] = useState([]);
  const [cargando, setCargando] = useState(false);

  // ✅ FIX 1: Parseo con hora local para evitar el desfase UTC-5
  const parsearFechaLocal = (fechaStr) => {
    if (!fechaStr) return null;
    return new Date(fechaStr + "T00:00:00");
  };

  useEffect(() => {
    const cargarReservas = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("fecha_ingreso, fecha_salida");

      if (error) {
        console.error("Error cargando reservas:", error);
        return;
      }

      const fechas = [];

      data.forEach((reserva) => {
        // ✅ FIX 2: Usar parseo local en vez de new Date("YYYY-MM-DD")
        const inicio = parsearFechaLocal(reserva.fecha_ingreso);
        const fin = parsearFechaLocal(reserva.fecha_salida);

        if (!inicio || !fin) return; // Protección contra nulls en BD

        for (
          let fecha = new Date(inicio);
          fecha <= fin;
          fecha.setDate(fecha.getDate() + 1)
        ) {
          fechas.push(new Date(fecha));
        }
      });

      setFechasOcupadas(fechas);
    };

    cargarReservas();
  }, []);

  const calcularNoches = () => {
    if (!ingreso || !salida) return 0;
    const diferencia = salida.getTime() - ingreso.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  };

  const noches = calcularNoches();
  const cantidadPersonas = Number(personas);

  // Tarifas por persona y tipo de reserva
  const tarifas = {
    "Entre semana":              { 1: 300000, 2: 420000, 3: 600000, 4: 780000 },
    "Fin de semana / Festivo":   { 1: 600000, 2: 650000, 3: 890000, 4: 1130000 },
  };

  const valorTotal = tarifas[tipoReserva]?.[cantidadPersonas] ?? 0;

  const obtenerDescuento = () => {
    if (noches === 2) return 10;
    if (noches === 3) return 15;
    return 0;
  };

  const descuentoPorcentaje = obtenerDescuento();
  const subtotal = noches > 0 ? valorTotal * noches : valorTotal;
  const descuentoValor = subtotal * (descuentoPorcentaje / 100);
  const totalFinal = subtotal - descuentoValor;
  const anticipo = totalFinal / 2;

  // ✅ FIX 3: También deshabilitar si no hay fechas seleccionadas
  const reservaPermitida = noches > 0 && noches <= 3;

  const handleIngresoChange = (date) => {
    setIngreso(date);
    // Si la salida es anterior o igual al nuevo ingreso, resetearla
    if (salida && date && salida <= date) {
      setSalida(null);
    }
  };

  const enviarWhatsApp = async () => {
    if (
      !nombre ||
      !identificacion ||
      !ocupacion ||
      !residencia ||
      !correo ||
      !celular ||
      !ingreso ||
      !salida
    ) {
      alert("Por favor completa todos los campos.");
      return;
    }

    if (noches > 3) {
      alert(
        "Para reservas superiores a 3 noches comunícate directamente con nuestro WhatsApp."
      );
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
          fecha_ingreso: ingreso.toISOString().split("T")[0],
          fecha_salida: salida.toISOString().split("T")[0],
          personas: cantidadPersonas,
          tipo_reserva: tipoReserva,
          anticipo,
          estado: "Pendiente",
        },
      ]);

      if (error) {
        console.error("Error al guardar reserva:", error);
        alert("No se pudo guardar la reserva. Intenta de nuevo.");
        return;
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con la base de datos.");
      return;
    } finally {
      setCargando(false);
    }

    const fmt = (d) => d?.toLocaleDateString("es-CO");

    const mensaje = `
REFUGIO LA ARBOLEDA

SOLICITUD DE RESERVA

DATOS DEL HUÉSPED

Nombre: ${nombre}
Identificación: ${identificacion}
Ocupación: ${ocupacion}
Residencia: ${residencia}
Correo: ${correo}
Celular: ${celular}

DETALLES DE LA ESTADÍA

Fecha de ingreso: ${fmt(ingreso)}
Fecha de salida: ${fmt(salida)}
Cantidad de personas: ${personas}
Tipo de reserva: ${tipoReserva}
Cantidad de noches: ${noches}

VALORES

Valor por noche: $${valorTotal.toLocaleString("es-CO")}
Cantidad de noches: ${noches}
Subtotal: $${subtotal.toLocaleString("es-CO")}
Descuento: ${descuentoPorcentaje}%
Valor descuento: $${descuentoValor.toLocaleString("es-CO")}
Total: $${totalFinal.toLocaleString("es-CO")}
Anticipo requerido (50%): $${anticipo.toLocaleString("es-CO")}

IMPORTANTE:
La reserva requiere confirmación mediante el pago del anticipo del 50%.
`.trim();

    const url = `https://wa.me/573136303649?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <section id="reservas" className="reservas">
      <h2>Reserva tu Experiencia</h2>

      <form className="reserva-form">
        <input
          type="text"
          placeholder="Nombre Completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          type="text"
          placeholder="Número de Identificación"
          value={identificacion}
          onChange={(e) => setIdentificacion(e.target.value)}
        />
        <input
          type="text"
          placeholder="Ocupación"
          value={ocupacion}
          onChange={(e) => setOcupacion(e.target.value)}
        />
        <input
          type="text"
          placeholder="Residencia"
          value={residencia}
          onChange={(e) => setResidencia(e.target.value)}
        />
        <input
          type="email"
          placeholder="Correo Electrónico"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <input
          type="text"
          placeholder="Celular"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
        />

        {/* ✅ FIX 4: Estructura corregida con labels individuales */}
        <div className="fechas-grid">
          <div>
            <label>Fecha de ingreso</label>
            <DatePicker
              selected={ingreso}
              onChange={handleIngresoChange}
              dateFormat="dd/MM/yyyy"
              minDate={new Date()}
              placeholderText="Ingreso"
              className="datepicker"
              // ✅ FIX 5: excludeDates ahora SÍ se pasa al componente
              excludeDates={fechasOcupadas}
            />
          </div>

          <div>
            <label>Fecha de salida</label>
            <DatePicker
              selected={salida}
              onChange={(date) => setSalida(date)}
              dateFormat="dd/MM/yyyy"
              minDate={ingreso ? new Date(ingreso.getTime() + 86400000) : new Date()}
              placeholderText="Salida"
              className="datepicker"
              excludeDates={fechasOcupadas}
              disabled={!ingreso}
            />
          </div>
        </div>

        {noches > 0 && (
          <div className="info-noches">
            <strong>Noches:</strong> {noches}
          </div>
        )}

        <select value={personas} onChange={(e) => setPersonas(e.target.value)}>
          <option value="1">1 Persona</option>
          <option value="2">2 Personas</option>
          <option value="3">3 Personas</option>
          <option value="4">4 Personas</option>
        </select>

        <select value={tipoReserva} onChange={(e) => setTipoReserva(e.target.value)}>
          <option value="Entre semana">Entre semana</option>
          <option value="Fin de semana / Festivo">Fin de semana / Festivo</option>
        </select>

        <div className="precio-reserva">
          <h2>Resumen de Reserva</h2>

          <div className="linea-resumen">
            <span>Valor por noche</span>
            <span>${valorTotal.toLocaleString("es-CO")}</span>
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
            <span>{descuentoPorcentaje}%</span>
          </div>
          <div className="linea-resumen">
            <span>Ahorro</span>
            <span>${descuentoValor.toLocaleString("es-CO")}</span>
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

        <button
          type="button"
          onClick={enviarWhatsApp}
          disabled={!reservaPermitida || cargando}
        >
          {cargando ? "Guardando..." : "Reservar por WhatsApp"}
        </button>

        <p>Para confirmar la reserva se solicita un anticipo del 50%.</p>
      </form>
    </section>
  );
}

export default Reservas;