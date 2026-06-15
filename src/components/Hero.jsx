function Hero() {
  return (
    <section
      id="inicio"
      className="hero"
    >
      <div className="hero-content">
        <h1>Refugio La Arboleda</h1>

        <p>
          Vive una experiencia única rodeado de naturaleza,
          confort y bienestar.
        </p>

        <div className="hero-buttons">

          <a href="#reservas" className="btn-reservar">
            Reservar Ahora
          </a>

          <a
            href="https://wa.me/573136303649?text=Hola,%20quiero%20información%20sobre%20Refugio%20La%20Arboleda"
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp"
          >
            WhatsApp
          </a>

        </div>
      </div>
    </section>
  );
}

export default Hero;