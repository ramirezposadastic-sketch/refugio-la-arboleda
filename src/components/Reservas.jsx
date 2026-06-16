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

useEffect(() => {
  const cargarReservas = async () => {
    const { data, error } = await supabase
      .from("reservas")
      .select("fecha_ingreso, fecha_salida");

    if (error) {
      console.error(error);
      return;
    }
    const fechas = [];

    data.forEach((reserva) => {
      const inicio = new Date(reserva.fecha_ingreso);
      const fin = new Date(reserva.fecha_salida);

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

  return Math.ceil(
    diferencia / (1000 * 60 * 60 * 24)
  );
};

  const noches = calcularNoches();

  let valorTotal = 0;

  const cantidadPersonas = Number(personas);

  if (tipoReserva === "Entre semana") {
    switch (cantidadPersonas) {
      case 1:
        valorTotal = 300000;
        break;
      case 2:
        valorTotal = 420000;
        break;
      case 3:
        valorTotal = 600000;
        break;
      case 4:
        valorTotal = 780000;
        break;
      default:
        valorTotal = 0;
    }
  } else {
    switch (cantidadPersonas) {
      case 1:
        valorTotal = 600000;
        break;
      case 2:
        valorTotal = 650000;
        break;
      case 3:
        valorTotal = 890000;
        break;
      case 4:
        valorTotal = 1130000;
        break;
      default:
        valorTotal = 0;
    }
  }

  const obtenerDescuento = () => {
    if (noches === 2) return 10;
    if (noches === 3) return 15;
    return 0;
  };

  const descuentoPorcentaje = obtenerDescuento();

  const subtotal =
  noches > 0
    ? valorTotal * noches
    : valorTotal;

  const descuentoValor =
    subtotal * (descuentoPorcentaje / 100);

  const totalFinal =
    subtotal - descuentoValor;

  const anticipo =
    totalFinal / 2;

  const reservaPermitida =
    noches <= 3 || noches === 0;

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
    try {

  const { error } = await supabase
    .from("reservas")
    .insert([
      {
        nombre,
        correo,
        celular,
        identificacion,
        ocupacion,
        residencia,
        fecha_ingreso: ingreso.toISOString().split("T")[0],
        fecha_salida: salida.toISOString().split("T")[0],
        personas: Number(personas),
        tipo_reserva: tipoReserva,
        anticipo,
        estado: "Pendiente",
      },
    ]);

  if (error) {
  console.error(error);
  alert(JSON.stringify(error));
  return;
}

} catch (err) {
  console.error(err);
  alert("Error de conexión con la base de datos.");
  return;
}

    if (noches > 3) {
      alert(
        "Para reservas superiores a 3 noches comunícate directamente con nuestro WhatsApp."
      );
      return;
    }

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

Fecha de ingreso:
${ingreso?.toLocaleDateString("es-CO")}

Fecha de salida:
${salida?.toLocaleDateString("es-CO")}

Cantidad de personas: ${personas}
Tipo de reserva: ${tipoReserva}
Cantidad de noches: ${noches}

VALORES

Valor por noche:
$${valorTotal.toLocaleString("es-CO")}

Cantidad de noches:
${noches}

Subtotal:
$${subtotal.toLocaleString("es-CO")}

Descuento:
${descuentoPorcentaje}%

Valor descuento:
$${descuentoValor.toLocaleString("es-CO")}

Total:
$${totalFinal.toLocaleString("es-CO")}

Anticipo requerido (50%):
$${anticipo.toLocaleString("es-CO")}

IMPORTANTE:
La reserva requiere confirmación mediante el pago del anticipo del 50%.
`;

    const url = `https://wa.me/573136303649?text=${encodeURIComponent(
      mensaje
    )}`;

    window.open(url, "_blank");
    };
  return (
    <section
  id="reservas"
  className="reservas"
>
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

        <div className="fechas-grid">

  <div>
    <label>Fecha de ingreso</label>

    <DatePicker
  selected={ingreso}
  onChange={(date) => setIngreso(date)}
  dateFormat="dd/MM/yyyy"
  minDate={new Date()}
  className="datepicker"
    
  />
  </div>

  <div>
    <label>Fecha de salida</label>

    <DatePicker
  selected={salida}
  onChange={(date) => setSalida(date)}
  dateFormat="dd/MM/yyyy"
  minDate={ingreso || new Date()}
  placeholderText="Salida"
  className="datepicker"
/>
  </div>

</div>
        {noches > 0 && (
          <div className="info-noches">
            <strong>Noches:</strong> {noches}
          </div>
        )}

        <select
          value={personas}
          onChange={(e) => setPersonas(e.target.value)}
        >
          <option value="1">1 Persona</option>
          <option value="2">2 Personas</option>
          <option value="3">3 Personas</option>
          <option value="4">4 Personas</option>
        </select>

        <select
          value={tipoReserva}
          onChange={(e) => setTipoReserva(e.target.value)}
        >
          <option value="Entre semana">
            Entre semana
          </option>

          <option value="Fin de semana / Festivo">
            Fin de semana / Festivo
          </option>
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
          disabled={!reservaPermitida}
        >
          Reservar por WhatsApp
        </button>

        <p>
          Para confirmar la reserva se solicita un anticipo del 50%.
        </p>
      </form>
    </section>
  );
}

export default Reservas;