import {
  FaLeaf,
  FaHotTub,
  FaMugHot,
  FaWater,
} from "react-icons/fa";

const experiencias = [
  {
    icono: FaLeaf,
    titulo: "Naturaleza cercana",
    texto: "Un entorno verde para descansar, caminar y respirar con calma.",
  },
  {
    icono: FaHotTub,
    titulo: "Jacuzzi privado",
    texto: "Un espacio íntimo con hidromasaje para relajarte al aire libre.",
  },
  {
    icono: FaWater,
    titulo: "Río y aventura",
    texto: "Tubing y caminatas ecológicas para vivir el paisaje de forma activa.",
  },
  {
    icono: FaMugHot,
    titulo: "Momentos cálidos",
    texto: "Fogata, chocolate caliente y detalles pensados para una estadía memorable.",
  },
];

function Experiencia() {
  return (
    <section id="experiencia" className="experiencia seccion-premium" data-aos="zoom-in">
      <div className="seccion-encabezado">
        <span className="section-kicker">Experiencia Refugio</span>
        <h2>Una escapada natural con confort</h2>
        <p>
          Madera, río, aire puro y detalles de bienestar para desconectarte de la rutina sin
          renunciar a la comodidad.
        </p>
      </div>

      <div className="experiencia-grid">
        {experiencias.map(({ icono: Icono, titulo, texto }) => (
          <article className="card experiencia-card" key={titulo}>
            <Icono aria-hidden="true" />
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Experiencia;
