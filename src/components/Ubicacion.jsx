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
    </section>
    
  );
  <iframe
  title="Ubicación Refugio La Arboleda"
  src="PEGAR_URL_DE_GOOGLE_MAPS"
  width="100%"
  height="450"
  style={{
    border: 0,
    borderRadius: "20px"
  }}
  loading="lazy"
/>
}

export default Ubicacion;