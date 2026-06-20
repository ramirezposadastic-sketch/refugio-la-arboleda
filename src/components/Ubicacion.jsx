function Ubicacion() {
  return (
    <section
      id="ubicacion"
      className="ubicacion"
    >
      <h2>¿Dónde Estamos?</h2>

      <p>
        Refugio La Arboleda te espera en un entorno natural
        único, ideal para desconectarte de la rutina.
      </p>

      <a
        href="https://maps.app.goo.gl/c8Ku8n2m3b55dJBy5?g_st=iw"
        target="_blank"
        rel="noreferrer"
      >
        Ver ubicación en Google Maps
      </a>

      <iframe
        title="Ubicación Refugio La Arboleda"
        src="https://www.google.com/maps?q=Refugio%20La%20Arboleda&output=embed"
        width="100%"
        height="450"
        style={{
          border: 0,
          borderRadius: "20px",
        }}
        loading="lazy"
      />
    </section>
  );
}

export default Ubicacion;
