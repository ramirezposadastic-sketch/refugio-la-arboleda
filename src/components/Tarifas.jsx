import { FaLeaf, FaArrowRight } from "react-icons/fa";

function Tarifas() {
  return (
    <section id="tarifas" className="tarifas seccion-premium">
      <div className="seccion-encabezado">
        <span className="section-kicker">Tarifas</span>
        <h2>Tarifas Refugio La Arboleda</h2>
        <p>Valores por noche según temporada y número de huéspedes.</p>
      </div>

      <div className="tarifas-grid">
        <div className="tarifa-card">
          <FaLeaf className="tarifa-icon" aria-hidden="true" />
          <h3>Entre semana</h3>
          <p><strong>Pareja:</strong> $440.000</p>
          <p><strong>Persona sola:</strong> $300.000</p>
          <p><strong>Persona adicional:</strong> $180.000</p>
          <p><strong>Menor de 8 años:</strong> $130.000</p>
        </div>

        <div className="tarifa-card">
          <FaLeaf className="tarifa-icon" aria-hidden="true" />
          <h3>Fin de semana y festivos</h3>
          <p><strong>Pareja:</strong> $650.000</p>
          <p><strong>Persona sola:</strong> $600.000</p>
          <p><strong>Persona adicional:</strong> $240.000</p>
          <p><strong>Menor de 8 años:</strong> $180.000</p>
        </div>
      </div>
      <div className="tarifas-pie">
        <p>Máximo 4 huéspedes por cabaña.</p>
        <a className="public-cta" href="#reservas">Consultar disponibilidad <FaArrowRight aria-hidden="true" /></a>
      </div>
    </section>
  );
}

export default Tarifas;
