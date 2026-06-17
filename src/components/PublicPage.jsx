import Navbar from "./Navbar";
import Hero from "./Hero";
import Experiencia from "./Experiencia";
import Cabañas from "./Cabañas";
import Tarifas from "./Tarifas";
import Actividades from "./Actividades";
import Ubicacion from "./Ubicacion";
import Reservas from "./Reservas";
import Contacto from "./Contacto";
import Footer from "./Footer";
import { FaWhatsapp } from "react-icons/fa";

function PublicPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Experiencia />
      <Cabañas />
      <Tarifas />
      <Actividades />
      <Ubicacion />
      <Reservas />
      <Contacto />

      <a
        href="https://wa.me/573136303649"
        className="whatsapp-float"
        target="_blank"
        rel="noreferrer"
      >
        <FaWhatsapp size={30} />
      </a>

      <Footer />
    </>
  );
}

export default PublicPage;