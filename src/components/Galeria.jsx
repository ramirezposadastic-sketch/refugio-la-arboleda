import { galeriaRefugio } from "../data/imagenesRefugio";
import { seleccionarFotosDinamicas } from "../lib/fotosSitio";

function Galeria({ fotosDinamicas }) {
  const fotosAdmin = seleccionarFotosDinamicas(fotosDinamicas, ["galeria"]);
  const imagenesGaleria = fotosAdmin.length > 0 ? fotosAdmin : galeriaRefugio;

  return (
    <section id="galeria" className="galeria seccion-premium">
      <div className="seccion-encabezado">
        <span className="section-kicker">Galería del Refugio</span>
        <h2>Una mirada a la experiencia</h2>
        <p>
          Cabañas, río, jacuzzi, madera y naturaleza en una selección breve de imágenes reales del
          refugio.
        </p>
      </div>

      <div className="galeria-grid">
        {imagenesGaleria.map((imagen, index) => (
          <figure className={index === 0 ? "galeria-item destacado" : "galeria-item"} key={imagen.src}>
            <img
              src={imagen.src}
              alt={imagen.alt}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}

export default Galeria;
