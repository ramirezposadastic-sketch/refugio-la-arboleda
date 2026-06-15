import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook
} from "react-icons/fa";

function Footer() {
  return (
    <footer id="footer" className="footer">

      <h3>Refugio La Arboleda</h3>

      <p>
        Un refugio natural diseñado para desconectarte de la rutina
        y reconectar con la naturaleza.
      </p>

      <div className="footer-icons">

        <a
          href="https://wa.me/573136303649"
          target="_blank"
          rel="noreferrer"
        >
          <FaWhatsapp />
        </a>

        <a
          href="https://instagram.com/refugioarboleda"
          target="_blank"
          rel="noreferrer"
        >
          <FaInstagram />
        </a>

        <a
            href="https://www.facebook.com/share/1Bcyh7ekzU/?mibextid=wwXIfr"
            target="_blank"
            rel="noreferrer"
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