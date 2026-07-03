import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Experiencia from "./Experiencia";
import Cabanas from "./Cabañas";
import Tarifas from "./Tarifas";
import BeneficiosIncluidos from "./BeneficiosIncluidos";
import Actividades from "./Actividades";
import Galeria from "./Galeria";
import Ubicacion from "./Ubicacion";
import Reservas from "./Reservas";
import Terminos from "./Terminos";
import Contacto from "./Contacto";
import Footer from "./Footer";
import { FaWhatsapp } from "react-icons/fa";
import { agruparFotosPorCategoria, cargarFotosActivasSitio } from "../lib/fotosSitio";

function PublicPage() {
  const [fotosDinamicas, setFotosDinamicas] = useState(null);

  useEffect(() => {
    AOS.init({ duration: 700, once: true });

    cargarFotosActivasSitio()
      .then((fotos) => setFotosDinamicas(agruparFotosPorCategoria(fotos)))
      .catch((error) => {
        console.warn("No se pudieron cargar fotos dinamicas, se usan imagenes locales:", error);
        setFotosDinamicas(null);
      });
  }, []);

  return (
    <>
      <Navbar />
      <Hero fotosDinamicas={fotosDinamicas} />
      <Experiencia />
      <Cabanas fotosDinamicas={fotosDinamicas} />
      <Tarifas />
      <BeneficiosIncluidos />
      <Actividades fotosDinamicas={fotosDinamicas} />
      <Galeria fotosDinamicas={fotosDinamicas} />
      <Ubicacion />
      <Reservas />
      <Terminos />
      <Contacto />

      <a
        href="https://wa.me/573136303649"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribir a Refugio La Arboleda por WhatsApp"
      >
        <FaWhatsapp size={30} />
      </a>

      <Footer />
    </>
  );
}

export default PublicPage;
