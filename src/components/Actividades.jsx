import { imagenesRefugio } from "../data/imagenesRefugio";
import { combinarImagenesConDinamicas } from "../lib/fotosSitio";

function Actividades({ fotosDinamicas }) {
  const imagenesActividades = combinarImagenesConDinamicas(
    imagenesRefugio.actividades,
    fotosDinamicas,
    ["actividades", "rio", "zonas"],
  );

  return (
    <section id="actividades" className="actividades seccion-premium" data-aos="zoom-in">
      <div className="seccion-encabezado">
        <span className="section-kicker">Experiencias incluidas</span>
        <h2>Actividades para conectar con el entorno</h2>
        <p>
          Naturaleza, bienestar y momentos especiales incluidos para que la estadía sea más que
          una noche de descanso.
        </p>
      </div>

      <div className="actividades-grid actividades-grid-premium">
        {imagenesActividades.map((actividad) => (
          <article className="actividad-card actividad-card-premium" key={actividad.titulo}>
            <img
              src={actividad.src}
              alt={actividad.alt}
              loading="lazy"
              decoding="async"
            />
            <div>
              <h3>{actividad.titulo}</h3>
              <p>{actividad.texto}</p>
              {actividad.nota && <span>{actividad.nota}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Actividades;
