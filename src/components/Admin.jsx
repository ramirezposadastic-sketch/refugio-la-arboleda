import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function Admin() {
  const [reservas, setReservas] = useState([]);

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .order("fecha_ingreso", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    console.log("RESERVAS:", data);
    setReservas(data);
  };
  const confirmarReserva = async (id) => {
  console.log("Intentando confirmar:", id);

  const { data, error } = await supabase
    .from("reservas")
    .update({ estado: "Confirmada" })
    .eq("id", id)
    .select();

  console.log("DATA:", data);
  console.log("ERROR:", error);

  cargarReservas();
};

const cancelarReserva = async (id) => {
  console.log("Intentando cancelar:", id);

  const { data, error } = await supabase
    .from("reservas")
    .update({ estado: "Cancelada" })
    .eq("id", id)
    .select();

  console.log("DATA:", data);
  console.log("ERROR:", error);

  cargarReservas();
};
const editarReserva = (reserva) => {
  console.log("Editar:", reserva);
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

  return (
    <section className="admin">
      <h2>Panel de Reservas</h2>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Ingreso</th>
            <th>Salida</th>
            <th>Personas</th>
            <th>Estado</th>
            <th>Acciones</th>
            <th>ID</th>
            <th>Identificación</th>
          </tr>
        </thead>

        <tbody>
          {reservas.map((r) => (
            <tr key={r.id}>
  <td>{r.nombre}</td>

  <td>
    {new Date(r.fecha_ingreso).toLocaleDateString("es-CO")}
  </td>

  <td>
    {new Date(r.fecha_salida).toLocaleDateString("es-CO")}
  </td>

  <td>{r.personas}</td>

  <td>
    <span className={`estado ${r.estado.toLowerCase()}`}>
      {r.estado}
    </span>
  </td>

<td>
  <div className="acciones">

    <button
      className="btn-confirmar"
      onClick={() => confirmarReserva(r.id)}
    >
      Confirmar
    </button>

    <button
      className="btn-cancelar"
      onClick={() => cancelarReserva(r.id)}
    >
      Cancelar
    </button>

    <button
      className="btn-editar"
      onClick={() => editarReserva(r)}
    >
      Editar
    </button>

    <button
      className="btn-eliminar"
      onClick={() => eliminarReserva(r.id)}
    >
      Eliminar
    </button>

  </div>
</td>

  <td>{r.id}</td>
  <td>{r.identificacion}</td>
</tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default Admin;