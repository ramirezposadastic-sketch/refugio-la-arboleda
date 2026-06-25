import { imagenesRefugio } from "../data/imagenesRefugio";

function Navbar() {
  return (
    <nav className="navbar">
      <a className="logo logo-marca" href="#inicio" aria-label="Ir al inicio de Refugio La Arboleda">
        <img src={imagenesRefugio.logo} alt="Logo Refugio La Arboleda" />
        <span>Refugio La Arboleda</span>
      </a>

      <ul className="nav-links">
        <li><a href="#inicio">Inicio</a></li>
        <li><a href="#cabanas">Cabañas</a></li>
        <li><a href="#tarifas">Tarifas</a></li>
        <li><a href="#actividades">Actividades</a></li>
        <li><a href="#galeria">Galería</a></li>
        <li><a href="#reservas">Reservas</a></li>
        <li><a href="#contacto">Contacto</a></li>
      </ul>
    </nav>
  );
}

export default Navbar;
