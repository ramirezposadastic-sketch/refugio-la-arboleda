import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaEnvelope
} from "react-icons/fa";

function Contacto() {
  return (
    <section id="contacto" className="contacto">
      <h2>Contáctanos</h2>

      <div className="contacto-info">

        <p>
          <FaWhatsapp />
          <a
            href="https://wa.me/573136303649"
            target="_blank"
            rel="noreferrer"
          >
            +57 313 630 3649
          </a>
        </p>

        <p>
          <FaEnvelope />
          <a href="mailto:refugiolaarboleda@gmail.com">
            refugiolaarboleda@gmail.com
          </a>
        </p>

        <p>
          <FaInstagram />
          <a
            href="https://instagram.com/refugioarboleda"
            target="_blank"
            rel="noreferrer"
          >
            @refugioarboleda
          </a>
        </p>

<p>
  <FaFacebook />
  <a
    href="https://www.facebook.com/share/1Bcyh7ekzU/?mibextid=wwXIfr"
    target="_blank"
    rel="noreferrer"
  >
    Refugio La Arboleda
  </a>
</p>

      </div>
    </section>
  );
}

export default Contacto;