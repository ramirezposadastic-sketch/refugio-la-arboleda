import { FaCheckCircle } from "react-icons/fa";
import { imagenesRefugio } from "../data/imagenesRefugio";

const caracteristicas = [
  "Cabaña de 45 metros cuadrados",
  "Cama doble",
  "Mezzanine con colchón auxiliar doble",
  "Cocina básica equipada",
  "TV",
  "Aire acondicionado",
  "Baño estilo premium",
  "Terraza al aire libre",
  "Jacuzzi con hidromasaje de 4 puestos",
  "Malla tipo catamarán",
  "Entorno natural",
];

function Cabanas() {
  return (
    <section id="cabanas" className="cabanas seccion-premium" data-aos="zoom-in">
      <div className="seccion-encabezado">
        <span className="section-kicker">Descanso privado</span>
        <h2>Cabañas de madera rodeadas de naturaleza</h2>
        <p>
          Contamos con 3 cabañas privadas del mismo diseño y equipamiento, rodeadas de naturaleza
          y pensadas para el descanso. La asignación se realiza según disponibilidad.
        </p>
      </div>

      <div className="cabanas-layout">
        <div className="cabanas-galeria">
          {imagenesRefugio.cabanas.map((imagen) => (
            <article className="cabana-imagen-card" key={imagen.src}>
              <img src={imagen.src} alt={imagen.alt} loading="lazy" decoding="async" />
              <h3>{imagen.titulo}</h3>
            </article>
          ))}
        </div>

        <div className="cabana-detalle">
          <h3>Todo lo necesario para desconectar</h3>
          <p>
            Una experiencia cálida, íntima y cómoda, con madera, aire fresco y espacios pensados
            para disfrutar en pareja, familia o con amigos.
          </p>

          <ul>
            {caracteristicas.map((item) => (
              <li key={item}>
                <FaCheckCircle aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default Cabanas;
