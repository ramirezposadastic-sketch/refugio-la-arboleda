import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  sumarDias,
} from "../lib/reservas";
import { generarMensajeReservaWhatsApp } from "../lib/notificacionesReserva";
import { calcularSaldo, normalizarValoresReserva, recalcularAnticipo } from "../lib/valoresReserva";
import { formatearFechaHoraColombia, formatearFechaReserva } from "../utils/fechas";

const FILTRO_TODAS = "Todas";
const FILTRO_TODOS = "Todos";
const FILTRO_MES_ACTUAL = "Mes actual";
const ROL_ADMIN = "admin";
const ROL_EMPLEADO = "empleado";
const MENSAJE_SIN_PERMISOS = "No tienes permisos para realizar esta acción.";
const BUCKET_FOTOS_SITIO = "imagenes-refugio";
const CATEGORIAS_FOTOS_SITIO = [
  "hero",
  "cabanas",
  "galeria",
  "actividades",
  "rio",
  "zonas",
  "exterior",
  "interior",
];
const FOTO_FORM_INICIAL = {
  titulo: "",
  descripcion: "",
  categoria: "galeria",
  activa: true,
  es_principal: false,
  orden: 0,
};

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
  return Number(reserva.total || 0);
}

function valorAnticipo(reserva) {
  return Number(reserva.anticipo || 0);
}

function valorSaldo(reserva) {
  return calcularSaldo(valorTotal(reserva), valorAnticipo(reserva));
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
  return formatearFechaReserva(fecha);
}

function fechaHoraLegible(fecha) {
  return formatearFechaHoraColombia(fecha);
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
function limpiarNombreArchivo(nombre) {
  const extension = nombre.includes(".") ? nombre.split(".").pop() : "jpg";
  const base = nombre
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return (base || "foto") + "." + extension.toLowerCase();
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
  const reservasScrollRef = useRef(null);
  const [puedeMoverIzquierda, setPuedeMoverIzquierda] = useState(false);
  const [puedeMoverDerecha, setPuedeMoverDerecha] = useState(false);
  const [mostrarControlesTabla, setMostrarControlesTabla] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [reservasEliminadas, setReservasEliminadas] = useState([]);
  const [mostrarHistorialEliminadas, setMostrarHistorialEliminadas] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);
  const [modoCrear, setModoCrear] = useState(false);
  const [valoresManuales, setValoresManuales] = useState(false);
  const [accionEnProceso, setAccionEnProceso] = useState(null);
  const [mostrarGestionFotos, setMostrarGestionFotos] = useState(false);
  const [fotosSitio, setFotosSitio] = useState([]);
  const [fotoForm, setFotoForm] = useState(FOTO_FORM_INICIAL);
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [cargandoFotos, setCargandoFotos] = useState(false);
  const [errorFotos, setErrorFotos] = useState("");
  const [mesCalendarioAdmin, setMesCalendarioAdmin] = useState(() => {
    const hoy = new Date();
    return { year: hoy.getFullYear(), month: hoy.getMonth() };
  });
  const [filtroCabanaCalendario, setFiltroCabanaCalendario] = useState(FILTRO_TODAS);
  const [fechaSeleccionadaCalendario, setFechaSeleccionadaCalendario] = useState(() => fechaToISO(new Date()));

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
  const puedeEditarTarifas = esAdmin || esEmpleado;
  const puedeConfirmarPagos = esAdmin || esEmpleado;

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

  const cargarFotosSitio = useCallback(async () => {
    if (!esAdmin) return;

    setCargandoFotos(true);
    setErrorFotos("");

    const { data, error } = await supabase
      .from("fotos_sitio")
      .select("*")
      .order("orden", { ascending: true })
      .order("creado_en", { ascending: false });

    setCargandoFotos(false);

    if (error) {
      console.error("No se pudieron cargar las fotos del sitio:", error);
      setErrorFotos("No se pudieron cargar las fotos. Revisa que supabase/fotos-sitio.sql esté ejecutado y que tu usuario tenga rol admin.");
      setFotosSitio([]);
      return;
    }

    setFotosSitio(data || []);
  }, [esAdmin]);


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

    let valores;
    try {
      valores = normalizarValoresReserva(reservaFinal);
    } catch (error) {
      alert(error.message);
      return null;
    }

    return {
      ...reservaFinal,
      cabana,
      adultos,
      ninos_menores: ninos,
      personas: adultos + ninos,
      ...valores,
      pago_confirmado: Boolean(reservaFinal.pago_confirmado),
    };
  };

  const confirmarReserva = async (reserva) => {
    if (!validarRolOperativo()) return;

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
    if (!validarRolOperativo()) return;

    if (["rechazado", "error", "anulado", "declined", "voided"].includes(normalizarEstado(reserva.pago_estado)) &&
      !window.confirm("Wompi registra un pago no aprobado. Confirma solo si verificaste un pago por otro medio. El estado de Wompi no se modificará. ¿Continuar?")) return;

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
    setValoresManuales(true);
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
    if (!puedeEditarTarifas) {
      alert(MENSAJE_SIN_PERMISOS);
      return;
    }

    if (!["total", "anticipo"].includes(campo)) return;
    const numero = valor === "" ? "" : Number(valor);
    setValoresManuales(true);
    setReservaEditando((actual) => {
      const actualizada = { ...actual, [campo]: numero };
      return { ...actualizada, saldo_pendiente: calcularSaldo(actualizada.total, actualizada.anticipo) };
    });
  };

  const recalcularValoresEstandar = () => {
    if (!puedeEditarTarifas) {
      alert(MENSAJE_SIN_PERMISOS);
      return;
    }

    let valores;
    try {
      valores = recalcularAnticipo(reservaEditando.total);
    } catch (error) {
      alert(error.message);
      return;
    }
    setValoresManuales(true);
    setReservaEditando((actual) => ({
      ...actual,
      ...valores,
    }));
  };

  const subirFotoSitio = async (event) => {
    event.preventDefault();
    if (!validarSoloAdmin()) return;

    if (!archivoFoto) {
      alert("Selecciona una imagen para subir.");
      return;
    }

    if (!fotoForm.titulo.trim()) {
      alert("Escribe un titulo para la foto.");
      return;
    }

    setCargandoFotos(true);
    setErrorFotos("");

    const storagePath = fotoForm.categoria + "/" + Date.now() + "-" + limpiarNombreArchivo(archivoFoto.name);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_FOTOS_SITIO)
      .upload(storagePath, archivoFoto, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("No se pudo subir la foto:", uploadError);
      const mensaje = uploadError.message?.toLowerCase().includes("bucket")
        ? "Falta configurar el bucket imagenes-refugio en Supabase."
        : uploadError.message || "No se pudo subir la foto.";
      setErrorFotos(mensaje);
      alert(mensaje);
      setCargandoFotos(false);
      return;
    }

    const { data: publicData } = supabase.storage.from(BUCKET_FOTOS_SITIO).getPublicUrl(storagePath);
    const payload = {
      ...fotoForm,
      titulo: fotoForm.titulo.trim(),
      descripcion: fotoForm.descripcion.trim(),
      orden: Number(fotoForm.orden || 0),
      url: publicData.publicUrl,
      storage_path: storagePath,
    };

    const { data, error } = await supabase.from("fotos_sitio").insert([payload]).select("*").single();

    setCargandoFotos(false);

    if (error) {
      console.error("No se pudo guardar la foto en fotos_sitio:", error);
      setErrorFotos("La imagen subió, pero no se pudo guardar el registro. Revisa supabase/fotos-sitio.sql y permisos de admin.");
      alert(error.message || "No se pudo guardar la foto.");
      return;
    }

    setFotosSitio((actuales) => [data, ...actuales]);
    setFotoForm(FOTO_FORM_INICIAL);
    setArchivoFoto(null);
    alert("Foto guardada correctamente.");
  };

  const actualizarFotoSitio = async (foto, cambios) => {
    if (!validarSoloAdmin()) return;

    setAccionEnProceso("foto-" + foto.id);
    const { data, error } = await supabase.from("fotos_sitio").update(cambios).eq("id", foto.id).select("*").single();
    setAccionEnProceso(null);

    if (error) {
      console.error("No se pudo actualizar la foto:", error);
      alert(error.message || "No se pudo actualizar la foto.");
      return;
    }

    setFotosSitio((actuales) => actuales.map((item) => (item.id === foto.id ? data : item)));
  };

  const eliminarFotoSitio = async (foto) => {
    if (!validarSoloAdmin()) return;
    if (!window.confirm("Deseas eliminar esta foto del sitio?")) return;

    setAccionEnProceso("foto-" + foto.id);
    const { error } = await supabase.from("fotos_sitio").delete().eq("id", foto.id);

    if (error) {
      console.error("No se pudo eliminar la foto:", error);
      alert(error.message || "No se pudo eliminar la foto.");
      setAccionEnProceso(null);
      return;
    }

    if (foto.storage_path) {
      await supabase.storage.from(BUCKET_FOTOS_SITIO).remove([foto.storage_path]);
    }

    setAccionEnProceso(null);
    setFotosSitio((actuales) => actuales.filter((item) => item.id !== foto.id));
  };

  const copiarUrlFoto = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("URL copiada.");
    } catch (error) {
      console.error("No se pudo copiar la URL:", error);
      alert(url);
    }
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
    }).sort((a, b) => {
      const pendienteA = normalizarEstado(a.estado) === "pendiente";
      const pendienteB = normalizarEstado(b.estado) === "pendiente";
      if (pendienteA !== pendienteB) return pendienteA ? -1 : 1;
      const fechaA = a.fecha_ingreso || "";
      const fechaB = b.fecha_ingreso || "";
      if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }, [reservas, busqueda, filtroEstado, filtroCabana, filtroPago, filtroFecha]);

  const actualizarEstadoScrollReservas = useCallback(() => {
    const contenedor = reservasScrollRef.current;
    const tolerancia = 4;

    if (!contenedor) {
      setPuedeMoverIzquierda(false);
      setPuedeMoverDerecha(false);
      setMostrarControlesTabla(false);
      return;
    }

    const tieneDesbordamiento = contenedor.scrollWidth - contenedor.clientWidth > tolerancia;
    setMostrarControlesTabla(tieneDesbordamiento);
    setPuedeMoverIzquierda(tieneDesbordamiento && contenedor.scrollLeft > tolerancia);
    setPuedeMoverDerecha(
      tieneDesbordamiento &&
        contenedor.scrollLeft + contenedor.clientWidth < contenedor.scrollWidth - tolerancia,
    );
  }, []);

  const moverTablaReservas = (cantidad) => {
    reservasScrollRef.current?.scrollBy({
      left: cantidad,
      behavior: "smooth",
    });

    window.setTimeout(actualizarEstadoScrollReservas, 360);
  };

  useEffect(() => {
    const contenedor = reservasScrollRef.current;
    const actualizar = () => actualizarEstadoScrollReservas();
    const frame = window.requestAnimationFrame(actualizar);

    contenedor?.addEventListener("scroll", actualizar, { passive: true });
    window.addEventListener("resize", actualizar);

    return () => {
      window.cancelAnimationFrame(frame);
      contenedor?.removeEventListener("scroll", actualizar);
      window.removeEventListener("resize", actualizar);
    };
  }, [actualizarEstadoScrollReservas, reservasFiltradas.length]);
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

  const fechaISOCalendario = (year, month, day) => {
    const mes = String(month + 1).padStart(2, "0");
    const dia = String(day).padStart(2, "0");
    return `${year}-${mes}-${dia}`;
  };

  const nombreMesCalendario = (year, month) =>
    new Date(year, month, 1).toLocaleDateString("es-CO", {
      month: "long",
      year: "numeric",
    });

  const reservaBloqueaCalendario = (reserva) =>
    ["pendiente", "confirmada"].includes(normalizarEstado(reserva?.estado));

  const reservaOcupaFechaCalendario = (reserva, fechaISO) => {
    if (!reservaBloqueaCalendario(reserva)) return false;
    const ingreso = fechaToISO(reserva.fecha_ingreso);
    const salida = fechaToISO(reserva.fecha_salida);
    if (!ingreso || !salida) return false;
    return fechaISO >= ingreso && fechaISO < salida;
  };

  const reservasDeCabanaEnFecha = (fechaISO, cabana) =>
    reservas.filter(
      (reserva) =>
        normalizarCabana(reserva.cabana) === cabana &&
        reservaOcupaFechaCalendario(reserva, fechaISO),
    );

  const obtenerDetalleDiaCalendario = (fechaISO) => {
    const cabanas = CABANAS.map((cabana) => {
      const reservasCabana = reservasDeCabanaEnFecha(fechaISO, cabana);
      return {
        cabana,
        ocupada: reservasCabana.length > 0,
        reserva: reservasCabana[0] || null,
      };
    });
    const cabanasFiltradas =
      filtroCabanaCalendario === FILTRO_TODAS
        ? cabanas
        : cabanas.filter((item) => item.cabana === filtroCabanaCalendario);
    const libres = cabanasFiltradas.filter((item) => !item.ocupada).length;
    const total = cabanasFiltradas.length || CABANAS.length;
    const estado = libres === total ? "disponible" : libres === 0 ? "ocupado" : "parcial";

    return {
      fechaISO,
      cabanas,
      cabanasFiltradas,
      libres,
      total,
      estado,
    };
  };

  const diasCalendarioAdmin = (() => {
    const { year, month } = mesCalendarioAdmin;
    const primerDia = new Date(year, month, 1);
    const diasDelMes = new Date(year, month + 1, 0).getDate();
    const offsetLunes = (primerDia.getDay() + 6) % 7;
    const dias = [];

    for (let i = 0; i < offsetLunes; i += 1) {
      dias.push({ fueraMes: true, key: `vacio-inicio-${i}` });
    }

    for (let day = 1; day <= diasDelMes; day += 1) {
      const fechaISO = fechaISOCalendario(year, month, day);
      dias.push({
        key: fechaISO,
        day,
        fechaISO,
        fueraMes: false,
        ...obtenerDetalleDiaCalendario(fechaISO),
      });
    }

    while (dias.length % 7 !== 0) {
      dias.push({ fueraMes: true, key: `vacio-fin-${dias.length}` });
    }

    return dias;
  })();

  const detalleDiaSeleccionado = obtenerDetalleDiaCalendario(fechaSeleccionadaCalendario);

  const cambiarMesCalendario = (delta) => {
    setMesCalendarioAdmin((actual) => {
      const fecha = new Date(actual.year, actual.month + delta, 1);
      return { year: fecha.getFullYear(), month: fecha.getMonth() };
    });
  };

  const volverMesActualCalendario = () => {
    const hoy = new Date();
    setMesCalendarioAdmin({ year: hoy.getFullYear(), month: hoy.getMonth() });
    setFechaSeleccionadaCalendario(fechaToISO(hoy));
  };

  const abrirNuevaReservaDesdeCalendario = () => {
    if (!validarRolOperativo()) return;

    const salida = fechaToISO(sumarDias(new Date(`${fechaSeleccionadaCalendario}T00:00:00`), 1));
    const cabanaSugerida =
      filtroCabanaCalendario !== FILTRO_TODAS
        ? filtroCabanaCalendario
        : detalleDiaSeleccionado.cabanasFiltradas.find((item) => !item.ocupada)?.cabana || CABANAS[0];

    setModoCrear(true);
    setValoresManuales(false);
    setReservaEditando(
      aplicarCalculoAutomatico({
        ...crearReservaVacia(),
        fecha_ingreso: fechaSeleccionadaCalendario,
        fecha_salida: salida,
        cabana: cabanaSugerida,
      }),
    );
    setMostrarModal(true);
  };
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

  const copiarResumenReserva = async (reserva) => {
    if (!validarAdminAutorizado()) return;

    const resumen = generarMensajeReservaWhatsApp({
      ...reserva,
      total: valorTotal(reserva),
      anticipo: valorAnticipo(reserva),
      saldo_pendiente: valorSaldo(reserva),
      adultos: adultosReserva(reserva),
      ninos_menores: ninosReserva(reserva),
    });

    try {
      await navigator.clipboard.writeText(resumen);
      alert("Resumen de la reserva copiado.");
    } catch (error) {
      console.error("No se pudo copiar al portapapeles:", error);
      alert("No se pudo copiar el resumen. Revisa permisos del navegador.");
    }
  };

  const copiarLinkPago = async (reserva) => {
    if (!validarAdminAutorizado()) return;

    if (!reserva?.pago_url) {
      alert("Esta reserva todavía no tiene link de pago.");
      return;
    }

    try {
      await navigator.clipboard.writeText(reserva.pago_url);
      alert("Link de pago copiado.");
    } catch (error) {
      console.error("No se pudo copiar el link de pago:", error);
      alert("No se pudo copiar el link de pago. Revisa permisos del navegador.");
    }
  };

  const claseEstadoPagoWompi = (estado) => {
    const estadoNormalizado = normalizarEstado(estado);
    if (["aprobado", "approved", "pagado"].includes(estadoNormalizado)) return "pago-ok";
    if (["rechazado", "declined", "error", "voided"].includes(estadoNormalizado)) return "pago-error";
    return "pago-pendiente";
  };

  const etiquetaEstadoPagoWompi = (estado) => {
    const estadoNormalizado = normalizarEstado(estado || "pendiente");
    if (estadoNormalizado === "link_generado") return "Link generado";
    if (estadoNormalizado === "aprobado" || estadoNormalizado === "approved") return "Pago aprobado por Wompi";
    if (estadoNormalizado === "rechazado" || estadoNormalizado === "declined") return "Rechazado";
    if (estadoNormalizado === "error") return "Error";
    return estado || "Pendiente";
  };

  const tieneDatosPago = (reserva) =>
    Boolean(
      reserva?.pago_proveedor ||
      reserva?.pago_estado ||
      reserva?.pago_referencia ||
      reserva?.pago_url ||
      reserva?.pago_monto ||
      reserva?.pago_transaccion_id ||
      reserva?.pago_transaction_id ||
      reserva?.pago_metodo ||
      reserva?.pago_confirmado_en ||
      reserva?.pago_evento_raw ||
      reserva?.pago_raw ||
      reserva?.pago_error,
    );

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
    setMostrarGestionFotos(false);
    setFotosSitio([]);
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
              className="btn-fotos-admin"
              type="button"
              onClick={() => {
                const abrirFotos = !mostrarGestionFotos;
                setMostrarGestionFotos(abrirFotos);
                if (abrirFotos) cargarFotosSitio();
              }}
            >
              {mostrarGestionFotos ? "Ocultar fotos" : "Gestión de fotos"}
            </button>
          )}
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

      <div className="admin-metricas-bloques">
        <section className="admin-metricas-bloque">
          <h3>Estado de reservas</h3>
          <div className="admin-stats admin-stats-profesional">
            <div className="stat-card"><h3>{reservas.length}</h3><p>Total de reservas</p></div>
            <div className="stat-card pendiente solicitudes-nuevas"><h3>{pendientes}</h3><p>Solicitudes nuevas</p><span>Revisar primero</span></div>
            <div className="stat-card confirmada"><h3>{confirmadas}</h3><p>Confirmadas</p></div>
            <div className="stat-card cancelada"><h3>{canceladas}</h3><p>Canceladas</p></div>
          </div>
        </section>

        {esAdmin && (
          <section className="admin-metricas-bloque resumen-financiero-admin">
            <h3>Resumen financiero</h3>
            <div className="admin-stats admin-stats-profesional resumen-financiero-grid">
              <div className="stat-card ventas"><h3 className="valor-financiero">${formatoMoneda(dineroTotal)}</h3><p>Ventas totales</p></div>
              <div className="stat-card anticipos"><h3 className="valor-financiero">${formatoMoneda(anticiposTotales)}</h3><p>Anticipos</p></div>
              <div className="stat-card saldos"><h3 className="valor-financiero">${formatoMoneda(reportes.saldosPendientes)}</h3><p>Saldos pendientes</p></div>
              <div className="stat-card ingresos"><h3 className="valor-financiero">${formatoMoneda(reportes.ingresosMes)}</h3><p>Ingresos del mes</p></div>
            </div>
          </section>
        )}
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

      <section className="admin-calendario-disponibilidad">
        <div className="admin-calendario-header">
          <div>
            <span className="admin-calendario-kicker">Calendario</span>
            <h3>Calendario de disponibilidad</h3>
            <p>Consulta rápidamente qué fechas están ocupadas o disponibles por cabaña.</p>
          </div>
          <div className="admin-calendario-controles">
            <button type="button" onClick={() => cambiarMesCalendario(-1)}>Anterior</button>
            <strong>{nombreMesCalendario(mesCalendarioAdmin.year, mesCalendarioAdmin.month)}</strong>
            <button type="button" onClick={() => cambiarMesCalendario(1)}>Siguiente</button>
            <button type="button" onClick={volverMesActualCalendario}>Hoy</button>
          </div>
        </div>

        <div className="admin-calendario-toolbar">
          <div className="admin-calendario-leyenda" aria-label="Leyenda de disponibilidad">
            <span><i className="cal-dot disponible" />Disponible</span>
            <span><i className="cal-dot parcial" />Parcial</span>
            <span><i className="cal-dot ocupado" />Ocupado</span>
          </div>
          <label className="admin-calendario-filtro">
            Cabaña
            <select value={filtroCabanaCalendario} onChange={(event) => setFiltroCabanaCalendario(event.target.value)}>
              <option>{FILTRO_TODAS}</option>
              {CABANAS.map((cabanaItem) => <option key={cabanaItem}>{cabanaItem}</option>)}
            </select>
          </label>
        </div>

        <div className="admin-calendario-layout">
          <div className="admin-calendario-grid" aria-label="Calendario de disponibilidad mensual">
            {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((dia) => (
              <div className="admin-calendario-dia-nombre" key={dia}>{dia}</div>
            ))}
            {diasCalendarioAdmin.map((dia) => (
              dia.fueraMes ? (
                <div className="admin-calendario-dia fuera-mes" key={dia.key} aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  key={dia.key}
                  className={`admin-calendario-dia ${dia.estado} ${dia.fechaISO === fechaSeleccionadaCalendario ? "seleccionado" : ""} ${dia.fechaISO === fechaToISO(new Date()) ? "hoy" : ""}`}
                  onClick={() => setFechaSeleccionadaCalendario(dia.fechaISO)}
                  title={dia.cabanasFiltradas.map((item) => `${item.cabana}: ${item.ocupada ? "Ocupada" : "Disponible"}`).join(" | ")}
                >
                  <span className="admin-calendario-numero">{dia.day}</span>
                  <span className="admin-calendario-estado">{dia.estado === "disponible" ? "Disponible" : dia.estado === "parcial" ? "Parcial" : "Ocupado"}</span>
                  <strong>{dia.libres}/{dia.total} libres</strong>
                </button>
              )
            ))}
          </div>

          <aside className="admin-calendario-detalle">
            <span className={`admin-calendario-badge ${detalleDiaSeleccionado.estado}`}>
              {detalleDiaSeleccionado.estado === "disponible" ? "Disponible" : detalleDiaSeleccionado.estado === "parcial" ? "Parcial" : "Ocupado"}
            </span>
            <h4>Disponibilidad del {fechaLegible(fechaSeleccionadaCalendario)}</h4>
            <p>{detalleDiaSeleccionado.libres}/{detalleDiaSeleccionado.total} cabañas libres para nueva reserva.</p>
            <div className="admin-calendario-cabanas">
              {detalleDiaSeleccionado.cabanasFiltradas.map((item) => (
                <article className={item.ocupada ? "cabana-dia ocupada" : "cabana-dia disponible"} key={item.cabana}>
                  <strong>{item.cabana}</strong>
                  {item.ocupada ? (
                    <div>
                      <span>Ocupada por: {item.reserva?.nombre || "Cliente sin nombre"}</span>
                      <small>Ingreso: {fechaLegible(item.reserva?.fecha_ingreso)}</small>
                      <small>Salida: {fechaLegible(item.reserva?.fecha_salida)}</small>
                      <small>Estado: {item.reserva?.estado || "Pendiente"}</small>
                      <small>Pago: {item.reserva?.pago_confirmado ? "Confirmado" : etiquetaEstadoPagoWompi(item.reserva?.pago_estado)}</small>
                      <small>Observaciones: {item.reserva?.observaciones?.trim() || "Sin observaciones"}</small>
                    </div>
                  ) : (
                    <span>Disponible para nueva reserva</span>
                  )}
                </article>
              ))}
            </div>
            <button type="button" className="btn-nueva-reserva" onClick={abrirNuevaReservaDesdeCalendario}>
              Crear reserva para esta fecha
            </button>
          </aside>
        </div>
      </section>
      {esAdmin && mostrarGestionFotos && (
        <section className="admin-fotos">
          <div className="admin-fotos-header">
            <div>
              <h3>Gestión de fotos</h3>
              <p>Sube fotos al bucket imagenes-refugio y elige dónde aparecen en la página pública.</p>
            </div>
            <button type="button" className="btn-historial" onClick={cargarFotosSitio} disabled={cargandoFotos}>
              {cargandoFotos ? "Cargando..." : "Actualizar lista"}
            </button>
          </div>

          {errorFotos && <div className="admin-fotos-alerta">{errorFotos}</div>}

          <form className="admin-fotos-form" onSubmit={subirFotoSitio}>
            <label className="admin-foto-campo admin-foto-archivo">
              <span>Imagen</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setArchivoFoto(event.target.files?.[0] || null)}
              />
              <small>{archivoFoto ? archivoFoto.name : "Selecciona una foto horizontal y nítida."}</small>
            </label>

            <label className="admin-foto-campo">
              <span>Sección</span>
              <select
                value={fotoForm.categoria}
                onChange={(event) => setFotoForm((actual) => ({ ...actual, categoria: event.target.value }))}
              >
                {CATEGORIAS_FOTOS_SITIO.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </label>

            <label className="admin-foto-campo">
              <span>Título</span>
              <input
                type="text"
                placeholder="Ej. Cabaña principal"
                value={fotoForm.titulo}
                onChange={(event) => setFotoForm((actual) => ({ ...actual, titulo: event.target.value }))}
              />
            </label>

            <label className="admin-foto-campo admin-foto-descripcion">
              <span>Descripción corta</span>
              <input
                type="text"
                placeholder="Texto opcional para identificar la foto"
                value={fotoForm.descripcion}
                onChange={(event) => setFotoForm((actual) => ({ ...actual, descripcion: event.target.value }))}
              />
            </label>

            <label className="admin-foto-campo admin-foto-orden">
              <span>Orden</span>
              <input
                type="number"
                placeholder="0"
                value={fotoForm.orden}
                onChange={(event) => setFotoForm((actual) => ({ ...actual, orden: event.target.value }))}
              />
            </label>

            <div className="admin-foto-opciones">
              <label className="admin-foto-check">
                <input
                  type="checkbox"
                  checked={fotoForm.activa}
                  onChange={(event) => setFotoForm((actual) => ({ ...actual, activa: event.target.checked }))}
                />
                Activa
              </label>
              <label className="admin-foto-check">
                <input
                  type="checkbox"
                  checked={fotoForm.es_principal}
                  onChange={(event) => setFotoForm((actual) => ({ ...actual, es_principal: event.target.checked }))}
                />
                Principal
              </label>
            </div>

            <button type="submit" className="btn-confirmar admin-foto-submit" disabled={cargandoFotos}>
              {cargandoFotos ? "Subiendo..." : "Subir foto"}
            </button>
          </form>

          <div className="admin-fotos-grid">
            {fotosSitio.map((foto) => (
              <article className="admin-foto-card" key={foto.id}>
                <img src={foto.url} alt={foto.descripcion || foto.titulo} loading="lazy" />
                <div className="admin-foto-info">
                  <strong>{foto.titulo}</strong>
                  <span>{foto.categoria} · orden {foto.orden}</span>
                  {foto.descripcion && <p>{foto.descripcion}</p>}
                  <div className="admin-foto-badges">
                    <span className={foto.activa ? "pago-ok" : "pago-pendiente"}>{foto.activa ? "Activa" : "Inactiva"}</span>
                    {foto.es_principal && <span className="badge-nueva">Principal</span>}
                  </div>
                </div>
                <div className="admin-foto-actions">
                  <button
                    type="button"
                    className="btn-editar"
                    disabled={accionEnProceso === "foto-" + foto.id}
                    onClick={() => actualizarFotoSitio(foto, { activa: !foto.activa })}
                  >
                    {foto.activa ? "Desactivar" : "Activar"}
                  </button>
                  <button type="button" className="btn-copiar" onClick={() => copiarUrlFoto(foto.url)}>Copiar URL</button>
                  <a href={foto.url} target="_blank" rel="noopener noreferrer" className="btn-preview-foto">Vista previa</a>
                  <button
                    type="button"
                    className="btn-eliminar"
                    disabled={accionEnProceso === "foto-" + foto.id}
                    onClick={() => eliminarFotoSitio(foto)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
            {fotosSitio.length === 0 && !cargandoFotos && (
              <p className="admin-fotos-vacio">No hay fotos dinámicas cargadas. La página pública seguirá usando las imágenes locales.</p>
            )}
          </div>
        </section>
      )}

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
                      <td>{fechaHoraLegible(item.eliminado_en)}</td>
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

      <div className="admin-toolbar admin-toolbar-reservas">
        <button className="btn-nueva-reserva" onClick={nuevaReserva}>+ Nueva Reserva</button>
        <div className="admin-toolbar-reservas-info">
          <span>{reservasFiltradas.length} reservas visibles</span>
          {mostrarControlesTabla && (
            <div className="reservas-scroll-toolbar" aria-label="Controles de desplazamiento horizontal de reservas">
              <span className="reservas-scroll-label">Desplazar tabla</span>
              <button
                type="button"
                className="reservas-scroll-button"
                onClick={() => moverTablaReservas(-500)}
                disabled={!puedeMoverIzquierda}
                aria-label="Mover tabla hacia la izquierda"
              >
                ←
              </button>
              <button
                type="button"
                className="reservas-scroll-button"
                onClick={() => moverTablaReservas(500)}
                disabled={!puedeMoverDerecha}
                aria-label="Mover tabla hacia la derecha"
              >
                →
              </button>
            </div>
          )}
        </div>
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

      <div className="admin-tabla-wrapper reservas-table-scroll" ref={reservasScrollRef}>
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
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas.map((r) => {
              const esPendiente = normalizarEstado(r.estado) === "pendiente";
              return (
              <tr key={r.id} className={esPendiente ? "reserva-pendiente-row" : ""}>
                <td>
                  <span className="cliente-admin">{r.nombre}</span>
                  {esPendiente && <span className="badge-nueva">Nueva</span>}
                </td>
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
                  {tieneDatosPago(r) && (
                    <div className="pago-admin-detalle pago-wompi-detalle">
                      <span>Proveedor: {r.pago_proveedor || "Wompi"}</span>
                      <span className={claseEstadoPagoWompi(r.pago_estado)}>
                        Estado Wompi: {etiquetaEstadoPagoWompi(r.pago_estado)}
                      </span>
                      {r.pago_referencia && <span>Referencia: {r.pago_referencia}</span>}
                      {(r.pago_transaccion_id || r.pago_transaction_id) && <span>Transacción: {r.pago_transaccion_id || r.pago_transaction_id}</span>}
                      {r.pago_metodo && <span>Método: {r.pago_metodo}</span>}
                      <span>Valor checkout Wompi: {r.pago_monto == null ? "No registrado" : `$${formatoMoneda(r.pago_monto)}`}</span>
                      <span>Anticipo registrado: ${formatoMoneda(valorAnticipo(r))}</span>
                      {r.pago_confirmado_en && <span>Fecha de pago: {fechaHoraLegible(r.pago_confirmado_en)}</span>}
                      {r.pago_error && <span className="pago-error">Error: {r.pago_error}</span>}
                      {r.pago_url && (
                        <button type="button" className="btn-link-pago" onClick={() => copiarLinkPago(r)}>
                          Copiar checkout
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {r.observaciones?.trim() ? (
                    <div className="observaciones-reserva-admin">
                      <strong>Observaciones</strong>
                      <p>{r.observaciones}</p>
                    </div>
                  ) : (
                    <span className="observaciones-vacias-admin">Sin observaciones</span>
                  )}
                </td>
                <td>
                  <div className="acciones acciones-admin">
                    {puedeConfirmarPagos && <button className="btn-confirmar" onClick={() => confirmarReserva(r)} disabled={accionEnProceso === r.id}>Confirmar</button>}
                    {puedeConfirmarPagos && <button className="btn-pago" onClick={() => confirmarPago(r)} disabled={accionEnProceso === r.id}>Pago recibido</button>}
                    {esAdmin && <button className="btn-cancelar" onClick={() => cancelarReserva(r.id)} disabled={accionEnProceso === r.id}>Cancelar</button>}
                    <button className="btn-editar" onClick={() => editarReserva(r)} disabled={accionEnProceso === r.id}>Editar</button>
                    <button className="btn-copiar" onClick={() => copiarResumenReserva(r)} disabled={accionEnProceso === r.id}>Copiar resumen</button>
                    <button className="btn-eliminar" onClick={() => eliminarReserva(r)} disabled={accionEnProceso === r.id}>
                      {accionEnProceso === r.id ? "Procesando..." : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
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
                <label>Total<input type="number" min="0" value={reservaEditando.total || 0} onChange={(e) => actualizarImporte("total", e.target.value)} disabled={!puedeEditarTarifas} /></label>
                <label>Anticipo<input type="number" min="0" value={reservaEditando.anticipo || 0} onChange={(e) => actualizarImporte("anticipo", e.target.value)} disabled={!puedeEditarTarifas} /></label>
                <label>Saldo pendiente<input type="number" min="0" value={calcularSaldo(reservaEditando.total, reservaEditando.anticipo)} readOnly /></label>
              </div>
              <div className="acciones-valores-reserva">
                <button type="button" className="recalcular-valores-btn" onClick={recalcularValoresEstandar} disabled={!puedeEditarTarifas}>
                  <span aria-hidden="true">↻</span>
                  Recalcular 40%
                </button>
              </div>
              <p className="nota-valores">
                Puedes ajustar Total y Anticipo. El saldo se calcula automáticamente como Total menos Anticipo. Usa "Recalcular 40%" para restaurar el anticipo estándar.
              </p>
            </div>

            <label className="observaciones-modal-admin" htmlFor="observaciones-reserva-admin">
              Observaciones
              <textarea
                id="observaciones-reserva-admin"
                name="observaciones"
                placeholder="Ej. decoración especial, alergias, hora estimada de llegada..."
                value={reservaEditando.observaciones || ""}
                onChange={(e) => setReservaEditando({ ...reservaEditando, observaciones: e.target.value })}
              />
            </label>

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


