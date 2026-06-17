import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Experiencia from "./components/Experiencia";
import Cabañas from "./components/Cabañas";
import Tarifas from "./components/Tarifas";
import Reservas from "./components/Reservas";
import Contacto from "./components/Contacto";
import Actividades from "./components/Actividades";
import Ubicacion from "./components/Ubicacion";
import Footer from "./components/Footer";
import { FaWhatsapp } from "react-icons/fa";
import Admin from "./components/Admin";
function App() {

  return (
    <div>
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
  aria-label="WhatsApp"
>
  <FaWhatsapp size={30} />
</a>
      <Footer />
    </div>
  );
  
}

export default App;