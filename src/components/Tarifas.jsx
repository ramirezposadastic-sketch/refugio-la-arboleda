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
          <h3>Entre semana</h3>
          <p><strong>Pareja:</strong> $420.000</p>
          <p><strong>Persona sola:</strong> $300.000</p>
          <p><strong>Persona adicional:</strong> $180.000</p>
          <p><strong>Menor de 8 años:</strong> $130.000</p>
        </div>

        <div className="tarifa-card">
          <h3>Fin de semana y festivos</h3>
          <p><strong>Pareja:</strong> $650.000</p>
          <p><strong>Persona sola:</strong> $600.000</p>
          <p><strong>Persona adicional:</strong> $240.000</p>
          <p><strong>Menor de 8 años:</strong> $180.000</p>
        </div>
      </div>
    </section>
  );
}

export default Tarifas;
