import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import {
  CABANAS,
  calcularNoches,
  calcularTarifaReserva,
  fechaToISO,
  formatoMoneda,
  normalizarCabana,
  normalizarEstado,
  rangoDisponible,
} from "../lib/reservas";

const FILTRO_TODAS = "Todas";
const FILTRO_TODOS = "Todos";
const FILTRO_MES_ACTUAL = "Mes actual";
const ROL_ADMIN = "admin";
const ROL_EMPLEADO = "empleado";
const MENSAJE_SIN_PERMISOS = "No tienes permisos para realizar esta acción.";

function AdminLogin({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");

  const iniciarSesion = async (event) => {
    event.preventDefault();
    setErrorLogin("");
    setCargando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });

    setCargando(false);

    if (error) {
      console.error("Error de inicio de sesión:", error);
      setErrorLogin(error.message || "No se pudo iniciar sesión. Revisa el correo y la contraseña.");
      return;
    }

    onLogin(data.session);
  };

  return (
    <section className="admin-login">
      <form className="admin-login-card" onSubmit={iniciarSesion}>
        <div className="admin-login-brand">
          <span>Refugio La Arboleda</span>
          <h1>Panel Administrativo</h1>
        </div>

        <label>
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="admin@refugiolarboleda.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
          />
        </label>

        {errorLogin && <div className="admin-login-error">{errorLogin}</div>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Iniciando..." : "Iniciar sesión"}
        </button>
      </form>
    </section>
  );
}

function valorTotal(reserva) {
  return Number(reserva.total ?? Number(reserva.anticipo || 0) * 2);
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
  return Math.max(1, Number(reserva.adultos ?? reserva.personas ?? 1));
}

function ninosReserva(reserva) {
  return Math.max(0, Number(reserva.ninos_menores ?? 0));
}

function personasReserva(reserva) {
  return adultosReserva(reserva) + ninosReserva(reserva);
}

function fechaLegible(fecha) {
  if (!fecha) return "-";
  return new Date(`${fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-CO");
}

function ordenarReservas(reservas) {
  return [...reservas].sort((a, b) => {
    const fechaA = a.fecha_ingreso || "";
    const fechaB = b.fecha_ingreso || "";
    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
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
    cabana: CABANAS[0],
    estado: "Pendiente",
    observaciones: "",
    pago_confirmado: false,
  };
}

function normalizarReservaParaEditar(reserva) {
  return {
    ...reserva,
    cabana: normalizarCabana(reserva.cabana) || CABANAS[0],
    adultos: adultosReserva(reserva),
    ninos_menores: ninosReserva(reserva),
    personas: personasReserva(reserva),
    total: valorTotal(reserva),
    anticipo: valorAnticipo(reserva),
    saldo_pendiente: valorSaldo(reserva),
  };
}

function aplicarCalculoAutomatico(reserva) {
  if (!reserva.fecha_ingreso || !reserva.fecha_salida) {
    return {
      ...reserva,
      personas: Number(reserva.adultos || 1) + Number(reserva.ninos_menores || 0),
    };
  }

  const tarifa = calcularTarifaReserva({
    adultos: reserva.adultos,
    ninosMenores: reserva.ninos_menores,
    fechaIngreso: reserva.fecha_ingreso,
    fechaSalida: reserva.fecha_salida,
  });

  return {
    ...reserva,
    adultos: tarifa.adultos,
    ninos_menores: tarifa.ninosMenores,
    personas: tarifa.personas,
    total: tarifa.total,
    anticipo: tarifa.anticipo,
    saldo_pendiente: tarifa.saldoPendiente,
  };
}

function normalizarRol(rol) {
  return rol === ROL_EMPLEADO ? ROL_EMPLEADO : ROL_ADMIN;
}

function esReservaEliminada(reserva) {
  return normalizarEstado(reserva?.estado) === "eliminada";
}

function Admin() {
  const [session, setSession] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [verificandoPermisos, setVerificandoPermisos] = useState(false);
  const [adminAutorizado, setAdminAutorizado] = useState(null);
  const [rolUsuario, setRolUsuario] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(FILTRO_TODAS);
  const [filtroCabana, setFiltroCabana] = useState(FILTRO_TODAS);
  const [filtroPago, setFiltroPago] = useState(FILTRO_TODOS);
  const [filtroFecha, setFiltroFecha] = useState(FILTRO_TODOS);
  const [reservas, setReservas] = useState([]);
  const [reservasEliminadas, setReservasEliminadas] = useState([]);
  const [mostrarHistorialEliminadas, setMostrarHistorialEliminadas] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);
  const [modoCrear, setModoCrear] = useState(false);
  const [valoresManuales, setValoresManuales] = useState(false);
  const [accionEnProceso, setAccionEnProceso] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error verificando sesión:", error);
      }

      setAdminAutorizado(null);
      setRolUsuario(null);
      setVerificandoPermisos(Boolean(data.session));
      setReservas([]);
      setReservasEliminadas([]);
      setMostrarHistorialEliminadas(false);
      setSession(data.session || null);
      setVerificandoSesion(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setAdminAutorizado(null);
      setRolUsuario(null);
      setVerificandoPermisos(Boolean(nuevaSesion));
      setSession(nuevaSesion || null);
      setMostrarModal(false);
      setReservaEditando(null);
      if (!nuevaSesion) {
        setReservas([]);
        setReservasEliminadas([]);
        setMostrarHistorialEliminadas(false);
      }
      setVerificandoSesion(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const buscarAdminUser = async (campo, valor, incluirRol = true) => {
      let query = supabase
        .from("admin_users")
        .select(incluirRol ? "id, user_id, email, rol" : "id, user_id, email")
        .limit(1);

      query = campo === "email" ? query.ilike("email", valor) : query.eq(campo, valor);

      const { data, error } = await query;

      if (error && incluirRol && error.message?.toLowerCase().includes("rol")) {
        return buscarAdminUser(campo, valor, false);
      }

      if (error) return { data: null, error };
      return { data, error: null };
    };

    buscarAdminUser("user_id", session.user.id)
      .then(async ({ data, error }) => {
        if (error) {
          console.error("Error verificando permisos de admin por user_id:", error);
          setAdminAutorizado(false);
          setRolUsuario(null);
          setReservas([]);
          setReservasEliminadas([]);
          setVerificandoPermisos(false);
          return;
        }

        if (data?.length > 0) {
          setAdminAutorizado(true);
          setRolUsuario(normalizarRol(data[0].rol));
          setVerificandoPermisos(false);
          return;
        }

        const { data: emailData, error: emailError } = await buscarAdminUser("email", session.user.email);

        if (emailError) {
          console.error("Error verificando permisos de admin por email:", emailError);
          setAdminAutorizado(false);
          setRolUsuario(null);
          setReservas([]);
          setReservasEliminadas([]);
          setVerificandoPermisos(false);
          return;
        }

        const autorizado = (emailData || []).length > 0;
        setAdminAutorizado(autorizado);
        setRolUsuario(autorizado ? normalizarRol(emailData[0].rol) : null);
        if (!autorizado) {
          setReservas([]);
          setReservasEliminadas([]);
        }
        setVerificandoPermisos(false);
      });
  }, [session]);

  useEffect(() => {
    if (!session || !adminAutorizado) {
      return;
    }

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

        setReservas(ordenarReservas((data || []).filter((reserva) => !esReservaEliminada(reserva))));
      });
  }, [session, adminAutorizado]);

  useEffect(() => {
    if (!session || !adminAutorizado || rolUsuario !== ROL_ADMIN) {
      return;
    }

    supabase
      .from("reservas_eliminadas")
      .select("*")
      .order("eliminado_en", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("No se pudo cargar historial de eliminadas:", error);
          setReservasEliminadas([]);
          return;
        }

        setReservasEliminadas(data || []);
      });
  }, [session, adminAutorizado, rolUsuario]);

  const validarAdminAutorizado = () => {
    if (adminAutorizado !== true) {
      alert(MENSAJE_SIN_PERMISOS);
      return false;
    }

    return true;
  };

  const esAdmin = rolUsuario === ROL_ADMIN;
  const esEmpleado = rolUsuario === ROL_EMPLEADO;

  const validarSoloAdmin = () => {
    if (!validarAdminAutorizado()) return false;
    if (!esAdmin) {
      alert(MENSAJE_SIN_PERMISOS);
      return false;
    }

    return true;
  };

  const validarRolOperativo = () => {
    if (!validarAdminAutorizado()) return false;
    if (!esAdmin && !esEmpleado) {
      alert(MENSAJE_SIN_PERMISOS);
      return false;
    }

    return true;
  };

  const validarReserva = (reserva, cambios = {}) => {
    const reservaFinal = { ...reserva, ...cambios };
    const errores = [];
    const adultos = Math.max(1, Number(reservaFinal.adultos || reservaFinal.personas || 1));
    const ninos = Math.max(0, Number(reservaFinal.ninos_menores || 0));
    const cabana = normalizarCabana(reservaFinal.cabana);
    const estadoBloquea = ["pendiente", "confirmada"].includes(normalizarEstado(reservaFinal.estado));

    if (!reservaFinal.nombre?.trim()) errores.push("El nombre es obligatorio.");
    if (!reservaFinal.celular?.trim()) errores.push("El celular es obligatorio.");
    if (!cabana) errores.push("La cabaña es obligatoria.");
    if (!reservaFinal.fecha_ingreso) errores.push("La fecha de ingreso es obligatoria.");
    if (!reservaFinal.fecha_salida) errores.push("La fecha de salida es obligatoria.");
    if (adultos < 1) errores.push("Debe haber al menos 1 adulto.");
    if (ninos < 0) errores.push("Los niños no pueden ser negativos.");

    if (
      reservaFinal.fecha_ingreso &&
      reservaFinal.fecha_salida &&
      calcularNoches(reservaFinal.fecha_ingreso, reservaFinal.fecha_salida) <= 0
    ) {
      errores.push("La fecha de salida debe ser posterior a la fecha de ingreso.");
    }

    if (errores.length > 0) {
      alert(errores.join("\n"));
      return null;
    }

    if (
      estadoBloquea &&
      !rangoDisponible({
        reservas,
        fechaIngreso: reservaFinal.fecha_ingreso,
        fechaSalida: reservaFinal.fecha_salida,
        cabana,
        ignorarId: reservaFinal.id,
      })
    ) {
      alert("Esa cabaña ya tiene una reserva pendiente o confirmada en esas fechas.");
      return null;
    }

    const total = Number(reservaFinal.total || 0);
    const anticipo = Number(reservaFinal.anticipo || 0);
    const saldo = Number(reservaFinal.saldo_pendiente ?? Math.max(total - anticipo, 0));

    return {
      ...reservaFinal,
      cabana,
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
    if (!validarSoloAdmin()) return;

    const reservaValidada = validarReserva(normalizarReservaParaEditar(reserva), { estado: "Confirmada" });
    if (!reservaValidada) return;

    setAccionEnProceso(reserva.id);

    const { data, error } = await supabase
      .from("reservas")
      .update({ estado: "Confirmada" })
      .eq("id", reserva.id)
      .select("*")
      .single();

    setAccionEnProceso(null);

    if (error) {
      console.error("Error al confirmar reserva:", error);
      alert(error.message);
      return;
    }

    setReservas((actuales) => actuales.map((item) => (item.id === reserva.id ? data : item)));
  };

  const confirmarPago = async (reserva) => {
    if (!validarSoloAdmin()) return;

    const reservaValidada = validarReserva(normalizarReservaParaEditar(reserva), {
      estado: "Confirmada",
      pago_confirmado: true,
    });
    if (!reservaValidada) return;

    setAccionEnProceso(reserva.id);

    const { data, error } = await supabase
      .from("reservas")
      .update({
        pago_confirmado: true,
        estado: "Confirmada",
      })
      .eq("id", reserva.id)
      .select("*")
      .single();

    setAccionEnProceso(null);

    if (error) {
      console.error("Error al marcar pago recibido:", error);
      alert(error.message);
      return;
    }

    setReservas((actuales) => actuales.map((item) => (item.id === reserva.id ? data : item)));
  };

  const cancelarReserva = async (id) => {
    if (!validarSoloAdmin()) return;

    setAccionEnProceso(id);

    const { data, error } = await supabase
      .from("reservas")
      .update({ estado: "Cancelada" })
      .eq("id", id)
      .select("*")
      .single();

    setAccionEnProceso(null);

    if (error) {
      console.error("Error al cancelar reserva:", error);
      alert(error.message);
      return;
    }

    setReservas((actuales) => actuales.map((item) => (item.id === id ? data : item)));
  };

  const editarReserva = (reserva) => {
    if (!validarRolOperativo()) return;

    setModoCrear(false);
    setValoresManuales(esAdmin);
    setReservaEditando(normalizarReservaParaEditar(reserva));
    setMostrarModal(true);
  };

  const nuevaReserva = () => {
    if (!validarRolOperativo()) return;

    setModoCrear(true);
    setValoresManuales(false);
    setReservaEditando(aplicarCalculoAutomatico(crearReservaVacia()));
    setMostrarModal(true);
  };

  const guardarEdicion = async () => {
    if (!validarRolOperativo()) return;

    const reservaOriginal = !modoCrear
      ? reservas.find((item) => item.id === reservaEditando.id)
      : null;

    const reservaParaValidar = esAdmin
      ? reservaEditando
      : {
          ...reservaEditando,
          estado: reservaOriginal?.estado || "Pendiente",
          pago_confirmado: Boolean(reservaOriginal?.pago_confirmado),
        };

    const reservaValidada = validarReserva(reservaParaValidar);
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
      estado: esAdmin ? reservaValidada.estado || "Pendiente" : reservaOriginal?.estado || "Pendiente",
      observaciones: reservaValidada.observaciones || "",
      pago_confirmado: esAdmin ? reservaValidada.pago_confirmado : Boolean(reservaOriginal?.pago_confirmado),
      fecha_ingreso: reservaValidada.fecha_ingreso,
      fecha_salida: reservaValidada.fecha_salida,
    };

    setAccionEnProceso("guardar");

    const query = modoCrear
      ? supabase.from("reservas").insert([payload]).select("*").single()
      : supabase.from("reservas").update(payload).eq("id", reservaValidada.id).select("*").single();

    const { data, error } = await query;

    setAccionEnProceso(null);

    if (error) {
      console.error("Error al guardar reserva:", error);
      alert(error.message);
      return;
    }

    setMostrarModal(false);
    setModoCrear(false);
    setValoresManuales(false);

    if (modoCrear) {
      setReservas((actuales) => ordenarReservas([...actuales, data]));
    } else {
      setReservas((actuales) => actuales.map((item) => (item.id === data.id ? data : item)));
    }
  };

  const eliminarReserva = async (reserva) => {
    if (!validarRolOperativo()) return;

    const id = reserva?.id;

    if (id === null || id === undefined || id === "") {
      console.error("No se puede eliminar la reserva porque no tiene un id valido.", reserva);
      alert("No se puede eliminar esta reserva porque no tiene un id valido.");
      return;
    }

    const motivo = window.prompt("Motivo de eliminacion");

    if (motivo === null) return;

    const motivoLimpio = motivo.trim();

    if (!motivoLimpio) {
      alert("El motivo de eliminacion es obligatorio.");
      return;
    }

    setAccionEnProceso(id);

    const { error } = await supabase.rpc("eliminar_reserva_con_motivo", {
      p_reserva_id: id,
      p_motivo: motivoLimpio,
    });

    setAccionEnProceso(null);

    if (error) {
      console.error("Error al eliminar reserva con motivo:", error);
      alert(`No se pudo eliminar la reserva. Verifica que ejecutaste supabase/roles-auditoria-admin.sql. Detalle: ${error.message}`);
      return;
    }

    setReservas((actuales) => actuales.filter((item) => item.id !== id));
    if (esAdmin) {
      setReservasEliminadas((actuales) => [
        {
          id: `local-${id}-${Date.now()}`,
          reserva_id: id,
          reserva_snapshot: reserva,
          motivo: motivoLimpio,
          eliminado_por: session?.user?.id || null,
          eliminado_por_email: session?.user?.email || "",
          eliminado_en: new Date().toISOString(),
        },
        ...actuales,
      ]);
    }
    alert("Reserva eliminada y registrada en el historial.");
  };

  const actualizarCampoReserva = (campo, valor) => {
    if (!esAdmin && ["estado", "pago_confirmado"].includes(campo)) {
      alert(MENSAJE_SIN_PERMISOS);
      return;
    }

    setReservaEditando((actual) => {
      const actualizada = { ...actual, [campo]: valor };
      if (valoresManuales) return actualizada;
      return aplicarCalculoAutomatico(actualizada);
    });
  };

  const actualizarHuespedes = (campo, valor) => {
    const numero = campo === "adultos" ? Math.max(1, Number(valor || 1)) : Math.max(0, Number(valor || 0));
    actualizarCampoReserva(campo, numero);
  };

  const actualizarImporte = (campo, valor) => {
    if (!esAdmin) {
      alert(MENSAJE_SIN_PERMISOS);
      return;
    }

    const numero = Number(valor || 0);
    setValoresManuales(true);
    setReservaEditando((actual) => {
      const nuevo = { ...actual, [campo]: numero };
      if (campo === "total" || campo === "anticipo") {
        nuevo.saldo_pendiente = Math.max(Number(nuevo.total || 0) - Number(nuevo.anticipo || 0), 0);
      }
      return nuevo;
    });
  };

  const reservasFiltradas = useMemo(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    return reservas.filter((r) => {
      const busquedaNormalizada = busqueda.trim().toLowerCase();
      const coincideBusqueda =
        !busquedaNormalizada ||
        r.nombre?.toLowerCase().includes(busquedaNormalizada) ||
        r.celular?.toString().includes(busquedaNormalizada);

      const coincideEstado = filtroEstado === FILTRO_TODAS || r.estado === filtroEstado;
      const coincideCabana = filtroCabana === FILTRO_TODAS || normalizarCabana(r.cabana) === filtroCabana;
      const coincidePago =
        filtroPago === FILTRO_TODOS ||
        (filtroPago === "Pago confirmado" && r.pago_confirmado) ||
        (filtroPago === "Pago pendiente" && !r.pago_confirmado);

      const fechaIngreso = r.fecha_ingreso ? new Date(`${r.fecha_ingreso.slice(0, 10)}T00:00:00`) : null;
      const coincideFecha =
        filtroFecha === FILTRO_TODOS ||
        (fechaIngreso &&
          filtroFecha === FILTRO_MES_ACTUAL &&
          fechaIngreso.getMonth() === mesActual &&
          fechaIngreso.getFullYear() === anioActual);

      return coincideBusqueda && coincideEstado && coincideCabana && coincidePago && coincideFecha;
    });
  }, [reservas, busqueda, filtroEstado, filtroCabana, filtroPago, filtroFecha]);

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

    const saldosPendientes = reservasValidas.reduce((acc, r) => acc + valorSaldo(r), 0);

    const porMes = reservas.reduce((acc, r) => {
      const llave = (r.created_at || r.fecha_ingreso || "").slice(0, 7) || "Sin fecha";
      acc[llave] = (acc[llave] || 0) + 1;
      return acc;
    }, {});

    const porCabana = CABANAS.reduce((acc, cabana) => {
      acc[cabana] = reservas.filter((r) => normalizarCabana(r.cabana) === cabana).length;
      return acc;
    }, {});

    return { ingresosMes, saldosPendientes, porMes, porCabana };
  }, [reservas]);

  const exportarCsv = () => {
    if (!validarSoloAdmin()) return;

    const columnas = [
      "nombre",
      "celular",
      "correo",
      "cabana",
      "fecha_ingreso",
      "fecha_salida",
      "adultos",
      "ninos",
      "personas",
      "total",
      "anticipo",
      "saldo_pendiente",
      "estado",
      "pago_confirmado",
      "observaciones",
    ];

    const filas = reservasFiltradas.map((r) => [
      r.nombre || "",
      r.celular || "",
      r.correo || "",
      normalizarCabana(r.cabana),
      r.fecha_ingreso || "",
      r.fecha_salida || "",
      adultosReserva(r),
      ninosReserva(r),
      personasReserva(r),
      valorTotal(r),
      valorAnticipo(r),
      valorSaldo(r),
      r.estado || "",
      r.pago_confirmado ? "Si" : "No",
      r.observaciones || "",
    ]);

    const escapar = (valor) => `"${String(valor).replaceAll('"', '""')}"`;
    const csv = [columnas, ...filas].map((fila) => fila.map(escapar).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservas-refugio-la-arboleda-${fechaToISO(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pendientes = reservas.filter((r) => normalizarEstado(r.estado) === "pendiente").length;
  const confirmadas = reservas.filter((r) => normalizarEstado(r.estado) === "confirmada").length;
  const canceladas = reservas.filter((r) => normalizarEstado(r.estado) === "cancelada").length;
  const reservasNoCanceladas = reservas.filter((r) => normalizarEstado(r.estado) !== "cancelada");
  const dineroTotal = reservasNoCanceladas.reduce((acc, r) => acc + valorTotal(r), 0);
  const anticiposTotales = reservasNoCanceladas.reduce((acc, r) => acc + valorAnticipo(r), 0);

  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error al cerrar sesión:", error);
      alert(error.message || "No se pudo cerrar sesión.");
      return;
    }

    setAdminAutorizado(null);
    setRolUsuario(null);
    setVerificandoPermisos(false);
    setAccionEnProceso(null);
    setSession(null);
    setReservas([]);
    setReservasEliminadas([]);
    setMostrarHistorialEliminadas(false);
  };

  if (verificandoSesion) {
    return (
      <section className="admin">
        <h2>Cargando panel...</h2>
      </section>
    );
  }

  if (!session) {
    return (
      <AdminLogin
        onLogin={(nuevaSesion) => {
          setAdminAutorizado(null);
          setVerificandoPermisos(Boolean(nuevaSesion));
          setSession(nuevaSesion);
        }}
      />
    );
  }

  if (verificandoPermisos || adminAutorizado === null) {
    return (
      <section className="admin">
        <h2>Verificando permisos...</h2>
      </section>
    );
  }

  if (adminAutorizado !== true) {
    return (
      <section className="admin-login">
        <div className="admin-login-card">
          <div className="admin-login-brand">
            <span>Refugio La Arboleda</span>
            <h1>Panel Administrativo</h1>
          </div>
          <div className="admin-login-error">
            No tienes permisos para acceder al panel administrativo.
          </div>
          <button type="button" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="admin">
      <div className="admin-header">
        <div>
          <h2>Panel de Reservas</h2>
          <p>Gestión de disponibilidad, pagos y reportes. Rol: {rolUsuario || "sin rol"}</p>
        </div>
        <div className="admin-header-actions">
          {esAdmin && <button className="btn-exportar" onClick={exportarCsv}>Exportar reservas</button>}
          {esAdmin && (
            <button
              className="btn-historial"
              type="button"
              onClick={() => setMostrarHistorialEliminadas((valor) => !valor)}
            >
              {mostrarHistorialEliminadas ? "Ocultar eliminadas" : "Ver eliminadas"}
            </button>
          )}
          <button className="btn-salir" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </div>

      <div className="admin-stats admin-stats-profesional">
        <div className="stat-card"><h3>{reservas.length}</h3><p>Total de reservas</p></div>
        <div className="stat-card pendiente"><h3>{pendientes}</h3><p>Pendientes</p></div>
        <div className="stat-card confirmada"><h3>{confirmadas}</h3><p>Confirmadas</p></div>
        <div className="stat-card cancelada"><h3>{canceladas}</h3><p>Canceladas</p></div>
        <div className="stat-card ventas"><h3>${formatoMoneda(dineroTotal)}</h3><p>Ventas totales</p></div>
        <div className="stat-card anticipos"><h3>${formatoMoneda(anticiposTotales)}</h3><p>Anticipos</p></div>
        <div className="stat-card saldos"><h3>${formatoMoneda(reportes.saldosPendientes)}</h3><p>Saldos pendientes</p></div>
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

      {esAdmin && mostrarHistorialEliminadas && (
        <div className="admin-historial-eliminadas">
          <h3>Historial de reservas eliminadas</h3>
          <div className="admin-tabla-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Cabaña</th>
                  <th>Ingreso</th>
                  <th>Salida</th>
                  <th>Total</th>
                  <th>Eliminado por</th>
                  <th>Fecha</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {reservasEliminadas.map((item) => {
                  const snapshot = item.reserva_snapshot || {};
                  return (
                    <tr key={item.id}>
                      <td>{snapshot.nombre || "-"}</td>
                      <td>{normalizarCabana(snapshot.cabana) || "-"}</td>
                      <td>{fechaLegible(snapshot.fecha_ingreso)}</td>
                      <td>{fechaLegible(snapshot.fecha_salida)}</td>
                      <td>${formatoMoneda(valorTotal(snapshot))}</td>
                      <td>{item.eliminado_por_email || "-"}</td>
                      <td>{fechaLegible(item.eliminado_en)}</td>
                      <td>{item.motivo}</td>
                    </tr>
                  );
                })}
                {reservasEliminadas.length === 0 && (
                  <tr>
                    <td colSpan="8">No hay reservas eliminadas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-toolbar">
        <button className="btn-nueva-reserva" onClick={nuevaReserva}>+ Nueva Reserva</button>
        <span>{reservasFiltradas.length} reservas visibles</span>
      </div>

      <div className="admin-filtros admin-filtros-profesional">
        <input type="text" placeholder="Buscar por nombre o celular..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option>{FILTRO_TODAS}</option>
          <option>Pendiente</option>
          <option>Confirmada</option>
          <option>Cancelada</option>
        </select>
        <select value={filtroCabana} onChange={(e) => setFiltroCabana(e.target.value)}>
          <option>{FILTRO_TODAS}</option>
          {CABANAS.map((cabana) => <option key={cabana}>{cabana}</option>)}
        </select>
        <select value={filtroPago} onChange={(e) => setFiltroPago(e.target.value)}>
          <option>{FILTRO_TODOS}</option>
          <option>Pago pendiente</option>
          <option>Pago confirmado</option>
        </select>
        <select value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}>
          <option>{FILTRO_TODOS}</option>
          <option>{FILTRO_MES_ACTUAL}</option>
        </select>
      </div>

      <div className="admin-tabla-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Celular</th>
              <th>Cabaña</th>
              <th>Ingreso</th>
              <th>Salida</th>
              <th>Noches</th>
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
                <td>{r.celular}</td>
                <td>{normalizarCabana(r.cabana)}</td>
                <td>{fechaLegible(r.fecha_ingreso)}</td>
                <td>{fechaLegible(r.fecha_salida)}</td>
                <td>{calcularNoches(r.fecha_ingreso, r.fecha_salida)}</td>
                <td>{adultosReserva(r)}</td>
                <td>{ninosReserva(r)}</td>
                <td>{personasReserva(r)}</td>
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
                  <div className="acciones acciones-admin">
                    {esAdmin && <button className="btn-confirmar" onClick={() => confirmarReserva(r)} disabled={accionEnProceso === r.id}>Confirmar</button>}
                    {esAdmin && <button className="btn-pago" onClick={() => confirmarPago(r)} disabled={accionEnProceso === r.id}>Pago recibido</button>}
                    {esAdmin && <button className="btn-cancelar" onClick={() => cancelarReserva(r.id)} disabled={accionEnProceso === r.id}>Cancelar</button>}
                    <button className="btn-editar" onClick={() => editarReserva(r)} disabled={accionEnProceso === r.id}>Editar</button>
                    <button className="btn-eliminar" onClick={() => eliminarReserva(r)} disabled={accionEnProceso === r.id}>
                      {accionEnProceso === r.id ? "Procesando..." : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarModal && reservaEditando && (
        <div className="modal-overlay">
          <div className="modal-editar modal-admin-profesional">
            <h2>{modoCrear ? "Nueva Reserva" : "Editar Reserva"}</h2>

            <div className="modal-seccion">
              <h3>Cliente</h3>
              <div className="modal-grid">
                <input type="text" placeholder="Nombre" value={reservaEditando.nombre || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, nombre: e.target.value })} />
                <input type="text" placeholder="Celular" value={reservaEditando.celular || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, celular: e.target.value })} />
                <input type="text" placeholder="Identificación" value={reservaEditando.identificacion || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, identificacion: e.target.value })} />
                <input type="email" placeholder="Correo" value={reservaEditando.correo || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, correo: e.target.value })} />
                <input type="text" placeholder="Ocupación" value={reservaEditando.ocupacion || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, ocupacion: e.target.value })} />
                <input type="text" placeholder="Residencia" value={reservaEditando.residencia || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, residencia: e.target.value })} />
              </div>
            </div>

            <div className="modal-seccion">
              <h3>Reserva</h3>
              <div className="modal-grid">
                <select value={normalizarCabana(reservaEditando.cabana) || CABANAS[0]} onChange={(e) => actualizarCampoReserva("cabana", e.target.value)}>
                  {CABANAS.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={reservaEditando.estado || "Pendiente"} onChange={(e) => actualizarCampoReserva("estado", e.target.value)} disabled={!esAdmin}>
                  <option>Pendiente</option>
                  <option>Confirmada</option>
                  <option>Cancelada</option>
                </select>
                <label>Ingreso<input type="date" value={reservaEditando.fecha_ingreso || ""} onChange={(e) => actualizarCampoReserva("fecha_ingreso", e.target.value)} /></label>
                <label>Salida<input type="date" value={reservaEditando.fecha_salida || ""} onChange={(e) => actualizarCampoReserva("fecha_salida", e.target.value)} /></label>
                <label>Adultos<input type="number" min="1" value={reservaEditando.adultos || 1} onChange={(e) => actualizarHuespedes("adultos", e.target.value)} /></label>
                <label>Niños menores<input type="number" min="0" value={reservaEditando.ninos_menores || 0} onChange={(e) => actualizarHuespedes("ninos_menores", e.target.value)} /></label>
              </div>
            </div>

            <div className="modal-seccion">
              <h3>Valores</h3>
              <div className="modal-grid">
                <label>Total<input type="number" min="0" value={reservaEditando.total || 0} onChange={(e) => actualizarImporte("total", e.target.value)} disabled={!esAdmin} /></label>
                <label>Anticipo<input type="number" min="0" value={reservaEditando.anticipo || 0} onChange={(e) => actualizarImporte("anticipo", e.target.value)} disabled={!esAdmin} /></label>
                <label>Saldo pendiente<input type="number" min="0" value={reservaEditando.saldo_pendiente || 0} onChange={(e) => actualizarImporte("saldo_pendiente", e.target.value)} disabled={!esAdmin} /></label>
              </div>
              <p className="nota-valores">
                {valoresManuales
                  ? "Valores manuales activos."
                  : esAdmin
                    ? "Los valores se recalculan automaticamente con fechas y huespedes."
                    : "Empleado: los valores se recalculan automaticamente y no se pueden editar manualmente."}
              </p>
            </div>

            <textarea placeholder="Observaciones" value={reservaEditando.observaciones || ""} onChange={(e) => setReservaEditando({ ...reservaEditando, observaciones: e.target.value })} />

            <label className="check-pago">
              <input type="checkbox" checked={reservaEditando.pago_confirmado || false} onChange={(e) => actualizarCampoReserva("pago_confirmado", e.target.checked)} disabled={!esAdmin} />
              Pago confirmado
            </label>

            <div className="modal-botones">
              <button className="btn-confirmar" onClick={guardarEdicion} disabled={accionEnProceso === "guardar"}>
                {accionEnProceso === "guardar" ? "Guardando..." : "Guardar"}
              </button>
              <button className="btn-cancelar" onClick={() => setMostrarModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Admin;
