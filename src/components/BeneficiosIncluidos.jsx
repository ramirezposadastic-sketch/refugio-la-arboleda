import { FaCheckCircle } from "react-icons/fa";
import { imagenesRefugio } from "../data/imagenesRefugio";

const beneficios = [
  "Desayuno a la carta",
  "Tubing por el río",
  "Caminata ecológica guiada",
  "Exfoliación con chocolate",
  "Aromaterapia",
  "Acceso a piscinas naturales",
  "Fogata con chocolate caliente",
  "Acceso a las instalaciones de Río de Oro: restaurante, turcos, saunas, esculturas y senderos",
];

function BeneficiosIncluidos() {
  return (
    <section id="beneficios" className="beneficios-incluidos seccion-premium" data-aos="fade-up">
      <div className="beneficios-contenido">
        <div className="beneficios-copy">
          <span className="section-kicker">Valor incluido en tu plan</span>
          <h2>Todas las reservas incluyen</h2>
          <p>
            Tu estadía incluye experiencias de naturaleza, bienestar y agua para disfrutar el
            refugio como un plan completo, no solo como alojamiento.
          </p>

          <div className="beneficios-grid">
            {beneficios.map((beneficio) => (
              <div className="beneficio-item" key={beneficio}>
                <FaCheckCircle aria-hidden="true" />
                <span>{beneficio}</span>
              </div>
            ))}
          </div>
        </div>

        <figure className="beneficios-rio-oro">
          <img
            src={imagenesRefugio.rioDeOro}
            alt="Zonas naturales e instalaciones de Río de Oro incluidas en la experiencia"
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            <span>Experiencia Río de Oro</span>
            <strong>Restaurante, turcos, saunas, esculturas, senderos y zonas comunes.</strong>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export default BeneficiosIncluidos;
