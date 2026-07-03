import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
} from "react-icons/fa";
import { imagenesRefugio } from "../data/imagenesRefugio";

function Footer() {
  return (
    <footer id="footer" className="footer">
      <div className="footer-marca">
        <img src={imagenesRefugio.logo} alt="Logo Refugio La Arboleda" loading="lazy" decoding="async" />
        <h3>Refugio La Arboleda</h3>
      </div>

      <p>
        Un refugio natural diseñado para desconectarte de la rutina y reconectar con la naturaleza.
      </p>

      <div className="footer-icons">
        <a
          href="https://wa.me/573136303649"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp de Refugio La Arboleda"
        >
          <FaWhatsapp />
        </a>

        <a
          href="https://instagram.com/refugioarboleda"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram de Refugio La Arboleda"
        >
          <FaInstagram />
        </a>

        <a
          href="https://www.facebook.com/share/1Bcyh7ekzU/?mibextid=wwXIfr"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook de Refugio La Arboleda"
        >
          <FaFacebook />
        </a>
      </div>

      <p>
        © 2026 Refugio La Arboleda. Todos los derechos reservados.
      </p>
    </footer>
  );
}

export default Footer;
