import { useState } from "react";
import { imagenesRefugio } from "../data/imagenesRefugio";

const enlaces = [
  { href: "#inicio", texto: "Inicio" },
  { href: "#cabanas", texto: "Cabañas" },
  { href: "#tarifas", texto: "Tarifas" },
  { href: "#actividades", texto: "Actividades" },
  { href: "#galeria", texto: "Galería" },
  { href: "#reservas", texto: "Reservas" },
  { href: "#contacto", texto: "Contacto" },
];

function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <nav className={`navbar ${menuAbierto ? "menu-open" : ""}`}>
      <a
        className="logo logo-marca"
        href="#inicio"
        aria-label="Ir al inicio de Refugio La Arboleda"
        onClick={cerrarMenu}
      >
        <img src={imagenesRefugio.logo} alt="Logo Refugio La Arboleda" />
        <span>Refugio La Arboleda</span>
      </a>

      <button
        type="button"
        className="nav-toggle"
        aria-label="Abrir menú de navegación"
        aria-expanded={menuAbierto}
        aria-controls="menu-navegacion"
        onClick={() => setMenuAbierto((abierto) => !abierto)}
      >
        <span />
        <span />
        <span />
      </button>

      <ul
        id="menu-navegacion"
        className={`nav-links ${menuAbierto ? "nav-links-abierto" : ""}`}
      >
        {enlaces.map((enlace) => (
          <li key={enlace.href}>
            <a href={enlace.href} onClick={cerrarMenu}>
              {enlace.texto}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;
