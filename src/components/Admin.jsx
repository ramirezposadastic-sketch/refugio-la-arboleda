import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import {
  CABANAS,
  asignarPrimeraCabanaDisponible,
  calcularNoches,
  fechaToISO,
  formatoMoneda,
  normalizarCabana,
  normalizarEstado,
  rangoDisponible,
} from "../lib/reservas";

function valorTotal(reserva) {
  return Number(reserva.total ?? (Number(reserva.anticipo || 0) * 2));
}

function valorAnticipo(reserva) {
  return Number(reserva.anticipo || 0);
}

function valorSaldo(reserva) {
  if (reserva.saldo_pendiente !== null && reserva.saldo_pendiente !== undefined) {
    return Number(reserva.saldo_pendiente || 0);
  }

  return Math.max(valorTotal(reserva) - valorAnticipo(reserva), 0);
}

function adultosReserva(reserva) {
  return Number(reserva.adultos ?? reserva.personas ?? 1);
}

function ninosReserva(reserva) {
  return Number(reserva.ninos_menores ?? 0);
}

function crearReservaVacia() {
  const hoy = fechaToISO(new Date());

  return {
    id: null,
    nombre: "",
    celular: "",
    correo: "",
    identificacion: "",
    ocupacion: "",
    residencia: "",
    fecha_ingreso: hoy,
    fecha_salida: "",
    adultos: 2,
    ninos_menores: 0,
    personas: 2,
    total: 0,
    anticipo: 0,
    saldo_pendiente: 0,
    cabana: "Cabaña 1",
    estado: "Pendiente",
    observaciones: "",
    pago_confirmado: false,
  };
}

function Admin() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todas");
  const [reservas, setReservas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);
  const [modoCrear, setModoCrear] = useState(false);

  const cargarReservas = async () => {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .order("fecha_ingreso", { ascending: true });

    if (error) {
      console.error(error);
      alert("No se pudieron cargar las reservas.");
      return;
    }

    setReservas(data || []);
  };

  useEffect(() => {
    supabase
      .from("reservas")
      .select("*")
      .order("fecha_ingreso", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          alert("No se pudieron cargar las reservas.");
          return;
        }

        setReservas(data || []);
      });
  }, []);

  const validarReserva = (reserva, cambios = {}) => {
    const reservaFinal = { ...reserva, ...cambios };
    const estadoBloquea = ["pendiente", "confirmada"].includes(normalizarEstado(reservaFinal.estado));

    if (!reservaFinal.fecha_ingreso || !reservaFinal.fecha_salida) {
      alert("Completa fecha de ingreso y salida.");
      return null;
    }

    if (calcularNoches(reservaFinal.fecha_ingreso, reservaFinal.fecha_salida) <= 0) {
      alert("La fecha de salida debe ser posterior a la fecha de ingreso.");
      return null;
    }

    const cabanaAsignada = estadoBloquea
      ? asignarPrimeraCabanaDisponible({
          reservas,
          fechaIngreso: reservaFinal.fecha_ingreso,
          fechaSalida: reservaFinal.fecha_salida,
          cabanaPreferida: reservaFinal.cabana,
          ignorarId: reservaFinal.id,
        })
      : normalizarCabana(reservaFinal.cabana) || "Cabaña 1";

    if (estadoBloquea && !cabanaAsignada) {
      alert("No hay disponibilidad para esa cabaña y fechas.");
      return null;
    }

    if (
      estadoBloquea &&
      !rangoDisponible({
        reservas,
        fechaIngreso: reservaFinal.fecha_ingreso,
        fechaSalida: reservaFinal.fecha_salida,
        cabana: cabanaAsignada,
        ignorarId: reservaFinal.id,
      })
    ) {
      alert("Esa cabaña ya tiene una reserva pendiente o confirmada en esas fechas.");
      return null;
    }

    const adultos = Math.max(1, Number(reservaFinal.adultos || reservaFinal.personas || 1));
    const ninos = Math.max(0, Number(reservaFinal.ninos_menores || 0));
    const total = Number(reservaFinal.total || 0);
    const anticipo = Number(reservaFinal.anticipo || 0);
    const saldo = Number(reservaFinal.saldo_pendiente ?? Math.max(total - anticipo, 0));

    return {
      ...reservaFinal,
      cabana: cabanaAsignada,
      adultos,
      ninos_menores: ninos,
      personas: adultos + ninos,
      total,
      anticipo,
      saldo_pendiente: saldo,
      pago_confirmado: Boolean(reservaFinal.pago_confirmado),
    };
  };

  const confirmarReserva = async (reserva) => {
    const reservaValidada = validarReserva(normalizarReservaParaEditar(reserva), { estado: "Confirmada" });
    if (!reservaValidada) return;

    const { error } = await supabase
      .from("reservas")
      .update({ estado: "Confirmada", cabana: reservaValidada.cabana })
      .eq("id", reserva.id);

    if (error) {
      alert(error.message);
      return;
    }

    cargarReservas();
  };

  const confirmarPago = async (reserva) => {
    const reservaValidada = validarReserva(normalizarReservaParaEditar(reserva), {
      estado: "Confirmada",
      pago_confirmado: true,
    });
    if (!reservaValidada) return;

    const { error } = await supabase
      .from("reservas")
      .update({
        pago_confirmado: true,
        estado: "Confirmada",
        cabana: reservaValidada.cabana,
      })
      .eq("id", reserva.id);

    if (error) {
      alert(error.message);
      return;
    }

    cargarReservas();
  };

  const cancelarReserva = async (id) => {
    const { error } = await supabase.from("reservas").update({ estado: "Cancelada" }).eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    cargarReservas();
  };

  const normalizarReservaParaEditar = (reserva) => ({
    ...reserva,
    cabana: normalizarCabana(reserva.cabana),
    adultos: adultosReserva(reserva),
    ninos_menores: ninosReserva(reserva),
    personas: adultosReserva(reserva) + ninosReserva(reserva),
    total: valorTotal(reserva),
    anticipo: valorAnticipo(reserva),
    saldo_pendiente: valorSaldo(reserva),
  });

  const editarReserva = (reserva) => {
    setModoCrear(false);
    setReservaEditando(normalizarReservaParaEditar(reserva));
    setMostrarModal(true);
  };

  const nuevaReserva = () => {
    setModoCrear(true);
    setReservaEditando(crearReservaVacia());
    setMostrarModal(true);
  };

  const guardarEdicion = async () => {
    const reservaValidada = validarReserva(reservaEditando);
    if (!reservaValidada) return;

    const payload = {
      nombre: reservaValidada.nombre || "",
      correo: reservaValidada.correo || "",
      celular: reservaValidada.celular || "",
      identificacion: reservaValidada.identificacion || "",
      ocupacion: reservaValidada.ocupacion || "",
      residencia: reservaValidada.residencia || "",
      cabana: reservaValidada.cabana,
      adultos: reservaValidada.adultos,
      ninos_menores: reservaValidada.ninos_menores,
      personas: reservaValidada.personas,
      anticipo: reservaValidada.anticipo,
      total: reservaValidada.total,
      saldo_pendiente: reservaValidada.saldo_pendiente,
      estado: reservaValidada.estado || "Pendiente",
      observaciones: reservaValidada.observaciones || "",
      pago_confirmado: reservaValidada.pago_confirmado,
      fecha_ingreso: reservaValidada.fecha_ingreso,
      fecha_salida: reservaValidada.fecha_salida,
    };

    const query = modoCrear
      ? supabase.from("reservas").insert([payload])
      : supabase.from("reservas").update(payload).eq("id", reservaValidada.id);

    const { error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    setMostrarModal(false);
    setModoCrear(false);
    cargarReservas();
  };

  const eliminarReserva = async (id) => {
    if (!window.confirm("Deseas eliminar esta reserva?")) return;

    const { error } = await supabase.from("reservas").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    cargarReservas();
  };

  const actualizarImporte = (campo, valor) => {
    const numero = Number(valor || 0);
    setReservaEditando((actual) => {
      const nuevo = { ...actual, [campo]: numero };
      if (campo === "total" || campo === "anticipo") {
        nuevo.saldo_pendiente = Math.max(Number(nuevo.total || 0) - Number(nuevo.anticipo || 0), 0);
      }
      return nuevo;
    });
  };

  const actualizarHuespedes = (campo, valor) => {
    const numero = campo === "adultos" ? Math.max(1, Number(valor || 1)) : Math.max(0, Number(valor || 0));
    setReservaEditando((actual) => {
      const nuevo = { ...actual, [campo]: numero };
      nuevo.personas = Number(nuevo.adultos || 1) + Number(nuevo.ninos_menores || 0);
      return nuevo;
    });
  };

  const reservasFiltradas = reservas.filter((r) => {
    const coincideBusqueda =
      r.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.celular?.toString().includes(busqueda);

    const coincideEstado = filtroEstado === "Todas" || r.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const reportes = useMemo(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    const reservasValidas = reservas.filter((r) => normalizarEstado(r.estado) !== "cancelada");

    const ingresosMes = reservasValidas.reduce((acc, r) => {
      const fecha = new Date(`${(r.created_at || r.fecha_ingreso).slice(0, 10)}T00:00:00`);
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        return acc + valorTotal(r);
      }
      return acc;
    }, 0);

    const porMes = reservas.reduce((acc, r) => {
      const llave = (r.created_at || r.fecha_ingreso || "").slice(0, 7) || "Sin fecha";
      acc[llave] = (acc[llave] || 0) + 1;
      return acc;
    }, {});

    const porCabana = CABANAS.reduce((acc, cabana) => {
      acc[cabana] = reservas.filter((r) => normalizarCabana(r.cabana) === cabana).length;
      return acc;
    }, {});

    return { ingresosMes, porMes, porCabana };
  }, [reservas]);

  const pendientes = reservas.filter((r) => normalizarEstado(r.estado) === "pendiente").length;
  const confirmadas = reservas.filter((r) => normalizarEstado(r.estado) === "confirmada").length;
  const canceladas = reservas.filter((r) => normalizarEstado(r.estado) === "cancelada").length;
  const dineroTotal = reservas
    .filter((r) => normalizarEstado(r.estado) !== "cancelada")
    .reduce((acc, r) => acc + valorTotal(r), 0);
  const anticiposTotales = reservas
    .filter((r) => normalizarEstado(r.estado) !== "cancelada")
    .reduce((acc, r) => acc + valorAnticipo(r), 0);

  return (
    <section className="admin">
      <div className="admin-header">
        <div>
          <h2>Panel de Reservas</h2>
          <p>Gestion de disponibilidad, pagos y reportes.</p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card"><h3>{reservas.length}</h3><p>Total</p></div>
        <div className="stat-card pendiente"><h3>{pendientes}</h3><p>Pendientes</p></div>
        <div className="stat-card confirmada"><h3>{confirmadas}</h3><p>Confirmadas</p></div>
        <div className="stat-card cancelada"><h3>{canceladas}</h3><p>Canceladas</p></div>
        <div className="stat-card ventas"><h3>${formatoMoneda(dineroTotal)}</h3><p>Ventas</p></div>
        <div className="stat-card anticipos"><h3>${formatoMoneda(anticiposTotales)}</h3><p>Anticipos</p></div>
        <div className="stat-card ingresos"><h3>${formatoMoneda(reportes.ingresosMes)}</h3><p>Ingresos del mes</p></div>
      </div>

      <div className="admin-reportes">
        <div>
          <h3>Reservas por mes</h3>
          {Object.entries(reportes.porMes).map(([mes, total]) => (
            <p key={mes}><span>{mes}</span><strong>{total}</strong></p>
          ))}
        </div>
        <div>
          <h3>Reservas por cabaña</h3>
          {Object.entries(reportes.porCabana).map(([cabanaItem, total]) => (
            <p key={cabanaItem}><span>{cabanaItem}</span><strong>{total}</strong></p>
          ))}
        </div>
      </div>

      <button className="btn-nueva-reserva" onClick={nuevaReserva}>+ Nueva Reserva</button>

      <div className="admin-filtros">
        <input type="text" placeholder="Buscar cliente o celular..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option>Todas</option>
          <option>Pendiente</option>
          <option>Confirmada</option>
          <option>Cancelada</option>
        </select>
      </div>

      <div className="admin-tabla-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Cabaña</th>
              <th>Celular</th>
              <th>Ingreso</th>
              <th>Salida</th>
              <th>Adultos</th>
              <th>Niños</th>
              <th>Personas</th>
              <th>Total</th>
              <th>Anticipo</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas.map((r) => (
              <tr key={r.id}>
                <td>{r.nombre}</td>
                <td>{normalizarCabana(r.cabana)}</td>
                <td>{r.celular}</td>
                <td>{new Date(`${r.fecha_ingreso}T00:00:00`).toLocaleDateString("es-CO")}</td>
                <td>{new Date(`${r.fecha_salida}T00:00:00`).toLocaleDateString("es-CO")}</td>
                <td>{adultosReserva(r)}</td>
                <td>{ninosReserva(r)}</td>
                <td>{adultosReserva(r) + ninosReserva(r)}</td>
                <td>${formatoMoneda(valorTotal(r))}</td>
                <td>${formatoMoneda(valorAnticipo(r))}</td>
                <td>${formatoMoneda(valorSaldo(r))}</td>
                <td><span className={`estado ${normalizarEstado(r.estado)}`}>{r.estado}</span></td>
                <td>
                  <span className={r.pago_confirmado ? "pago-ok" : "pago-pendiente"}>
                    {r.pago_confirmado ? "Confirmado" : "Pendiente"}
                  </span>
                </td>
                <td>
                  <div className="acciones">
                    <button className="btn-confirmar" onClick={() => confirmarReserva(r)}>Confirmar</button>
                    <button className="btn-pago" onClick={() => confirmarPago(r)}>Pago recibido</button>
                    <button className="btn-cancelar" onClick={() => cancelarReserva(r.id)}>Cancelar</button>
                    <button className="btn-editar" onClick={() => editarReserva(r)}>Editar</button>
                    <button className="btn-eliminar" onClick={() => eliminarReserva(r.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarModal && reservaEditando && (
        <div className="modal-overlay">
          <div className="modal-editar">
            <h2>{modoCrear ? "Nueva Reserva" : "Editar Reserva"}</h2>

            <div className="modal-grid">
              <input type="text" placeholder="Nombre" value={reservaEditando.nombre || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, nombre: e.target.value })} />
              <input type="text" placeholder="Celular" value={reservaEditando.celular || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, celular: e.target.value })} />
              <input type="text" placeholder="Identificacion" value={reservaEditando.identificacion || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, identificacion: e.target.value })} />
              <input type="email" placeholder="Correo" value={reservaEditando.correo || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, correo: e.target.value })} />
              <label>Ingreso<input type="date" value={reservaEditando.fecha_ingreso || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, fecha_ingreso: e.target.value })} /></label>
              <label>Salida<input type="date" value={reservaEditando.fecha_salida || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, fecha_salida: e.target.value })} /></label>
              <label>Adultos<input type="number" min="1" value={reservaEditando.adultos || 1} onChange={(e) => actualizarHuespedes("adultos", e.target.value)} /></label>
              <label>Niños menores<input type="number" min="0" value={reservaEditando.ninos_menores || 0} onChange={(e) => actualizarHuespedes("ninos_menores", e.target.value)} /></label>
              <label>Total<input type="number" min="0" value={reservaEditando.total || 0} onChange={(e) => actualizarImporte("total", e.target.value)} /></label>
              <label>Anticipo<input type="number" min="0" value={reservaEditando.anticipo || 0} onChange={(e) => actualizarImporte("anticipo", e.target.value)} /></label>
              <label>Saldo pendiente<input type="number" min="0" value={reservaEditando.saldo_pendiente || 0} onChange={(e) => actualizarImporte("saldo_pendiente", e.target.value)} /></label>
              <select value={normalizarCabana(reservaEditando.cabana) || "Cabaña 1"} onChange={(e) => setReservaEditando({ ...reservaEditando, cabana: e.target.value })}>
                {CABANAS.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select value={reservaEditando.estado || "Pendiente"} onChange={(e) => setReservaEditando({ ...reservaEditando, estado: e.target.value })}>
                <option>Pendiente</option>
                <option>Confirmada</option>
                <option>Cancelada</option>
              </select>
            </div>

            <textarea placeholder="Observaciones" value={reservaEditando.observaciones || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, observaciones: e.target.value })} />

            <label className="check-pago">
              <input type="checkbox" checked={reservaEditando.pago_confirmado || false} onChange={(e) => setReservaEditando({ ...reservaEditando, pago_confirmado: e.target.checked })} />
              Pago confirmado
            </label>

            <div className="modal-botones">
              <button className="btn-confirmar" onClick={guardarEdicion}>Guardar</button>
              <button className="btn-cancelar" onClick={() => setMostrarModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Admin;
