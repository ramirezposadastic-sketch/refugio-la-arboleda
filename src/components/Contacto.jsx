import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaEnvelope,
} from "react-icons/fa";

function Contacto() {
  return (
    <section id="contacto" className="contacto seccion-premium">
      <div className="seccion-encabezado">
        <span className="section-kicker">Contacto directo</span>
        <h2>Contáctanos</h2>
        <p>Resolveremos tus dudas y te acompañaremos en el proceso de reserva.</p>
      </div>

      <div className="contacto-info">
        <p>
          <FaWhatsapp aria-hidden="true" />
          <a
            href="https://wa.me/573136303649"
            target="_blank"
            rel="noopener noreferrer"
          >
            +57 313 630 3649
          </a>
        </p>

        <p>
          <FaEnvelope aria-hidden="true" />
          <a href="mailto:refugiolaarboleda@gmail.com">
            refugiolaarboleda@gmail.com
          </a>
        </p>

        <p>
          <FaInstagram aria-hidden="true" />
          <a
            href="https://instagram.com/refugioarboleda"
            target="_blank"
            rel="noopener noreferrer"
          >
            @refugioarboleda
          </a>
        </p>

        <p>
          <FaFacebook aria-hidden="true" />
          <a
            href="https://www.facebook.com/share/1Bcyh7ekzU/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
          >
            Refugio La Arboleda
          </a>
        </p>
      </div>
    </section>
  );
}

export default Contacto;
