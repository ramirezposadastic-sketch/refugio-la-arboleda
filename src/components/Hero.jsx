import { FaWhatsapp } from "react-icons/fa";
import { imagenesRefugio } from "../data/imagenesRefugio";

function Hero() {
  const mensajeWhatsApp = encodeURIComponent(
    "Hola, quiero información sobre Refugio La Arboleda",
  );

  return (
    <section
      id="inicio"
      className="hero hero-premium"
      style={{ "--hero-image": `url(${imagenesRefugio.hero})` }}
    >
      <div className="hero-content">
        <span className="section-kicker">Cabañas privadas en la naturaleza</span>
        <h1>Refugio La Arboleda</h1>
        <p>
          Cabañas privadas junto a la naturaleza, con desayuno, tubing por el río y caminatas
          ecológicas incluidas.
        </p>

        <div className="hero-buttons">
          <a href="#reservas" className="btn-reservar">
            Reservar ahora
          </a>

          <a
            href={`https://wa.me/573136303649?text=${mensajeWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
            aria-label="Consultar Refugio La Arboleda por WhatsApp"
          >
            <FaWhatsapp aria-hidden="true" />
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
