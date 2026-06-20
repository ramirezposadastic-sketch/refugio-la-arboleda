import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const ESTADOS_QUE_BLOQUEAN = ["Pendiente", "Confirmada"];

const parseFechaLocal = (fecha) => {
  if (!fecha) return null;
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const fechaLocalTime = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const fechaLegible = (fecha) =>
  parseFechaLocal(fecha)?.toLocaleDateString("es-CO") || "";

const seCruzanRangos = (inicioA, salidaA, inicioB, salidaB) =>
  fechaLocalTime(inicioA) < fechaLocalTime(salidaB) &&
  fechaLocalTime(inicioB) < fechaLocalTime(salidaA);

function Admin() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todas");
  const [reservas, setReservas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);
  const [modoCrear, setModoCrear] = useState(false);

  async function cargarReservas() {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .order("fecha_ingreso", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setReservas(data);
  }

  useEffect(() => {
    const cargarInicial = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("*")
        .order("fecha_ingreso", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      setReservas(data);
    };

    cargarInicial();
  }, []);

  const confirmarReserva = async (id) => {
    const { error } = await supabase
      .from("reservas")
      .update({ estado: "Confirmada" })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    cargarReservas();
  };
  const confirmarPago = async (id) => {
  const { error } = await supabase
    .from("reservas")
    .update({
      pago_confirmado: true,
      estado: "Confirmada",
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  cargarReservas();
};

  const cancelarReserva = async (id) => {
    const { error } = await supabase
      .from("reservas")
      .update({ estado: "Cancelada" })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    cargarReservas();
  };

  const editarReserva = (reserva) => {
  setModoCrear(false);

  setReservaEditando({
    ...reserva,
    id: reserva.id,
  });

  setMostrarModal(true);
};
const guardarEdicion = async () => {
  const validarDisponibilidad = async () => {
    const estado = reservaEditando.estado || "Pendiente";
    if (!ESTADOS_QUE_BLOQUEAN.includes(estado)) return true;

    const ingreso = parseFechaLocal(reservaEditando.fecha_ingreso);
    const salida = parseFechaLocal(reservaEditando.fecha_salida);

    if (!ingreso || !salida || salida <= ingreso) {
      alert("Revisa las fechas de ingreso y salida.");
      return false;
    }

    const { data, error } = await supabase
      .from("reservas")
      .select("id, fecha_ingreso, fecha_salida, cabana, estado")
      .eq("cabana", reservaEditando.cabana || "Cabaña 1")
      .in("estado", ESTADOS_QUE_BLOQUEAN);

    if (error) {
      console.error(error);
      alert("No se pudo validar la disponibilidad.");
      return false;
    }

    const existeCruce = (data || []).some((r) => {
      if (!modoCrear && r.id === reservaEditando.id) return false;

      const reservaInicio = parseFechaLocal(r.fecha_ingreso);
      const reservaSalida = parseFechaLocal(r.fecha_salida);

      return (
        reservaInicio &&
        reservaSalida &&
        seCruzanRangos(ingreso, salida, reservaInicio, reservaSalida)
      );
    });

    if (existeCruce) {
      alert("La cabaña seleccionada no está disponible en ese rango de fechas.");
      return false;
    }

    return true;
  };

  const disponibilidadOk = await validarDisponibilidad();
  if (!disponibilidadOk) return;

  if (modoCrear) {
    const { error } = await supabase
  .from("reservas")
  .insert([
    {
      nombre: reservaEditando.nombre || "",
      correo: reservaEditando.correo || "",
      celular: reservaEditando.celular || "",
      identificacion: Number(reservaEditando.identificacion || 0),
      ocupacion: reservaEditando.ocupacion || "",
      residencia: reservaEditando.residencia || "",
      cabana: reservaEditando.cabana || "Cabaña 1",
      personas: reservaEditando.personas
  ? Number(reservaEditando.personas)
  : 1,
      anticipo: Number(reservaEditando.anticipo || 0),
      total: Number(reservaEditando.total || 0),
      estado: reservaEditando.estado || "Pendiente",
      observaciones: reservaEditando.observaciones || "",
      pago_confirmado: reservaEditando.pago_confirmado || false,
      fecha_ingreso: reservaEditando.fecha_ingreso || null,
      fecha_salida: reservaEditando.fecha_salida || null,
    },
  ]);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setMostrarModal(false);
    setModoCrear(false);
    cargarReservas();
    return;
  }

  const { error } = await supabase
  .from("reservas")
  .update({
    nombre: reservaEditando.nombre || "",
    correo: reservaEditando.correo || "",
    celular: reservaEditando.celular || "",
    identificacion: reservaEditando.identificacion || "",
    ocupacion: reservaEditando.ocupacion || "",
    residencia: reservaEditando.residencia || "",
    cabana: reservaEditando.cabana || "Cabaña 1",

    personas: Number(reservaEditando.personas || 1),

    estado: reservaEditando.estado || "Pendiente",

    observaciones: reservaEditando.observaciones || "",

    pago_confirmado:
      reservaEditando.pago_confirmado || false,

    fecha_ingreso:
      reservaEditando.fecha_ingreso || null,

    fecha_salida:
      reservaEditando.fecha_salida || null,

    anticipo: Number(reservaEditando.anticipo || 0),

    total: Number(reservaEditando.total || 0),
  })
  .eq("id", reservaEditando.id);

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  setMostrarModal(false);
  cargarReservas();
};

  const eliminarReserva = async (id) => {
    const confirmar = window.confirm(
      "¿Deseas eliminar esta reserva?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("reservas")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    cargarReservas();
  };

  const reservasFiltradas = reservas.filter((r) => {
    const coincideBusqueda =
      r.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.celular?.toString().includes(busqueda);

    const coincideEstado =
      filtroEstado === "Todas" ||
      r.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const pendientes = reservas.filter(
    (r) => r.estado === "Pendiente"
  ).length;

  const confirmadas = reservas.filter(
    (r) => r.estado === "Confirmada"
  ).length;

  const canceladas = reservas.filter(
    (r) => r.estado === "Cancelada"
  ).length;
  const dineroTotal = reservas.reduce(
  (acc, r) => acc + Number(r.total || 0),
  0
);

const anticiposTotales = reservas.reduce(
  (acc, r) => acc + Number(r.anticipo || 0),
  0
);

  return (
    <section className="admin">

      <h2>Panel de Reservas</h2>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>{reservas.length}</h3>
          <p>Total</p>
        </div>

        <div className="stat-card pendiente">
          <h3>{pendientes}</h3>
          <p>Pendientes</p>
        </div>

        <div className="stat-card confirmada">
          <h3>{confirmadas}</h3>
          <p>Confirmadas</p>
        </div>

        <div className="stat-card cancelada">
          <h3>{canceladas}</h3>
          <p>Canceladas</p>
        </div>
      </div>
      <div className="stat-card">
  <h3>
    ${dineroTotal.toLocaleString("es-CO")}
  </h3>
  <p>Ventas</p>
</div>

<div className="stat-card">
  <h3>
    ${anticiposTotales.toLocaleString("es-CO")}
  </h3>
  <p>Anticipos</p>
</div>
<button
  className="btn-nueva-reserva"
  onClick={() => {
  setMostrarModal(false);
  setModoCrear(true);

  setReservaEditando({
  nombre: "",
  celular: "",
  correo: "",
  identificacion: 0,
  ocupacion: "",
  residencia: "",
  fecha_ingreso: "",
  fecha_salida: "",
  personas: 1,
  anticipo: 0,
  cabana: "Cabaña 1",
  estado: "Pendiente",
  observaciones: "",
  pago_confirmado: false,
  total: 0,
  id: null,
});

setMostrarModal(true);
  }}
>
  + Nueva Reserva
</button>

      <div className="admin-filtros">
        <input
          type="text"
          placeholder="Buscar cliente o celular..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={filtroEstado}
          onChange={(e) =>
            setFiltroEstado(e.target.value)
          }
        >
          <option>Todas</option>
          <option>Pendiente</option>
          <option>Confirmada</option>
          <option>Cancelada</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Cabaña</th>
            <th>Celular</th>
            <th>Ingreso</th>
            <th>Salida</th>
            <th>Personas</th>
            <th>Anticipo</th>
            <th>Total</th>
            <th>Estado</th> <th>Pago</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {reservasFiltradas.map((r) => (
            <tr key={r.id}>

              <td>{r.nombre}</td>

              <td>{r.cabana}</td>

              <td>{r.celular}</td>

              <td>
                {fechaLegible(r.fecha_ingreso)}
              </td>

              <td>
                {fechaLegible(r.fecha_salida)}
              </td>

              <td>{r.personas}</td>

              <td>
                $
                {Number(
                  r.anticipo || 0
                ).toLocaleString("es-CO")}
              </td>
              <td>
                $
                {Number(r.total || 0).toLocaleString("es-CO")}
              </td>
              <td>
                <span
                  className={`estado ${r.estado.toLowerCase()}`}
                >
                  {r.estado}
                </span>
              </td>

              <td>
                <span
                  className={`pago ${r.pago_confirmado ? "confirmado" : "pendiente"}`}
                >
                  {r.pago_confirmado ? "Confirmado" : "Pendiente"}
                </span>
              </td>

              <td>
                <div className="acciones">
                  <button
                    className="btn-confirmar"
                    onClick={() =>
                      confirmarReserva(r.id)
                    }
                  >
                    Confirmar
                  </button>
                  <button
                    className="btn-pago"
                    onClick={() => confirmarPago(r.id)}
                  >
                    Pago Recibido
                  </button>

                  <button
                    className="btn-cancelar"
                    onClick={() =>
                      cancelarReserva(r.id)
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="btn-editar"
                    onClick={() =>
                      editarReserva(r)
                    }
                  >
                    Editar
                  </button>

                  <button
                    className="btn-eliminar"
                    onClick={() =>
                      eliminarReserva(r.id)
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
      {mostrarModal && reservaEditando && (
  <div className="modal-overlay">
    <div className="modal-editar">

      <h2>
  {modoCrear
    ? "Nueva Reserva"
    : "Editar Reserva"}
</h2>

      <input
        type="text"
        placeholder="Nombre"
        value={reservaEditando.nombre || ""}
        onChange={(e) =>
          setReservaEditando({
            ...reservaEditando,
            nombre: e.target.value,
          })
        }
      />

      <input
        type="text"
        placeholder="Celular"
        value={reservaEditando.celular || ""}
        onChange={(e) =>
          setReservaEditando({
            ...reservaEditando,
            celular: e.target.value,
          })
        }
      />
      <input
  type="text"
  placeholder="Identificación"
  value={reservaEditando.identificacion || ""}
  onChange={(e) =>
    setReservaEditando({
      ...reservaEditando,
      identificacion: e.target.value,
    })
  }
/>

      <input
        type="text"
        placeholder="Correo"
        value={reservaEditando.correo || ""}
        onChange={(e) =>
          setReservaEditando({
            ...reservaEditando,
            correo: e.target.value,
          })
        }
      />
       <input
            type="date"
            value={reservaEditando.fecha_ingreso}
            onChange={(e) =>
              setReservaEditando({
                ...reservaEditando,
                fecha_ingreso: e.target.value,
              })
            }
          />

      <input
            type="date"
            value={reservaEditando.fecha_salida}
            onChange={(e) =>
              setReservaEditando({
                ...reservaEditando,
                fecha_salida: e.target.value,
              })
            }
          />
          <input
  type="number"
  min="1"
  max="4"
  value={reservaEditando.personas || 1}
  onChange={(e) =>
    setReservaEditando({
      ...reservaEditando,
      personas: Number(e.target.value),
    })
  }
/>
<input
  type="number"
  value={reservaEditando.anticipo}
  onChange={(e) =>
    setReservaEditando({
      ...reservaEditando,
      anticipo: e.target.value,
    })
  }
/>
<input
  type="number"
  placeholder="Total"
  value={reservaEditando.total || 0}
  onChange={(e) =>
    setReservaEditando({
      ...reservaEditando,
      total: e.target.value,
    })
  }
/>

      <select
        value={reservaEditando.cabana || ""}
        onChange={(e) =>
          setReservaEditando({
            ...reservaEditando,
            cabana: e.target.value,
          })
        }
      >
        <option>Cabaña 1</option>
        <option>Cabaña 2</option>
        <option>Cabaña 3</option>
      </select>

      <select
        value={reservaEditando.estado || ""}
        onChange={(e) =>
          setReservaEditando({
            ...reservaEditando,
            estado: e.target.value,
          })
        }
      >
        <option>Pendiente</option>
        <option>Confirmada</option>
        <option>Cancelada</option>
      </select>

      <textarea
        placeholder="Observaciones"
        value={reservaEditando.observaciones || ""}
        onChange={(e) =>
          setReservaEditando({
            ...reservaEditando,
            observaciones: e.target.value,
          })
        }
      />

      <label>
        <input
          type="checkbox"
          checked={
            reservaEditando.pago_confirmado || false
          }
          onChange={(e) =>
            setReservaEditando({
              ...reservaEditando,
              pago_confirmado: e.target.checked,
            })
          }
        />
        Pago confirmado
      </label>

      <div className="modal-botones">
        <button
          className="btn-confirmar"
          onClick={guardarEdicion}
        >
          Guardar
        </button>

        <button
          className="btn-cancelar"
          onClick={() =>
            setMostrarModal(false)
          }
        >
          Cancelar
        </button>
      </div>

    </div>
  </div>
)}

    </section>
  );
}

export default Admin;
