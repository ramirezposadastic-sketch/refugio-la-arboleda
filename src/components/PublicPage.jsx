import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Experiencia from "./Experiencia";
import Cabañas from "./Cabañas";
import Tarifas from "./Tarifas";
import Actividades from "./Actividades";
import Ubicacion from "./Ubicacion";
import Reservas from "./Reservas";
import Terminos from "./Terminos";
import Contacto from "./Contacto";
import Footer from "./Footer";
import { FaWhatsapp } from "react-icons/fa";

function PublicPage() {
  useEffect(() => {
    AOS.init({ duration: 700, once: true });
  }, []);

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
      <Terminos />
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
