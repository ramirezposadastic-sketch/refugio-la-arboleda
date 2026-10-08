import { useEffect, useId, useRef, useState } from "react";
import { FiGrid, FiCalendar, FiList, FiImage, FiBarChart2, FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { imagenesRefugio } from "../../data/imagenesRefugio";

export default function AdminSidebar({ esAdmin, rol, email, onLogout, onPhotos, activeView, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef(null);
  const drawerId = useId();
  const links = [
    { id: "admin-dashboard", label: "Panel de control", Icon: FiGrid },
    { id: "admin-reservas", label: "Reservas", Icon: FiList },
    { id: "admin-calendario", label: "Calendario", Icon: FiCalendar },
    { id: "admin-estadisticas", label: "Estadísticas", Icon: FiBarChart2 },
  ];
  const activeLabel = links.find(({ id }) => id === activeView)?.label
    ?? (activeView === "admin-fotos" ? "Gestión de fotos" : activeView === "admin-eliminadas" ? "Reservas eliminadas" : "Panel de control");

  useEffect(() => {
    if (!menuOpen) return;
    const drawer = drawerRef.current;
    const previousOverflow = document.body.style.overflow;
    drawer.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      drawer.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const navigate = (id) => {
    setMenuOpen(false);
    onNavigate(id);
  };
  const openPhotos = () => {
    setMenuOpen(false);
    onPhotos();
  };
  const logout = () => {
    setMenuOpen(false);
    onLogout();
  };
  const sidebarContent = (
    <>
      <button type="button" className="admin-sidebar-brand" onClick={() => navigate("admin-dashboard")}>
        <img src={imagenesRefugio.logo} alt="Logo Refugio La Arboleda" width="68" height="68" />
        <span>Refugio <br />La Arboleda</span>
      </button>
      <nav aria-label="Secciones del panel" className="admin-sidebar-nav">
        {links.map(({ id, label, Icon }) => (
          <button type="button" key={id} aria-current={activeView === id ? "page" : undefined} onClick={() => navigate(id)}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </button>
        ))}
        {esAdmin && <button type="button" aria-current={activeView === "admin-fotos" ? "page" : undefined} onClick={openPhotos}><FiImage aria-hidden="true" /><span>Gestión de fotos</span></button>}
      </nav>
      <div className="admin-sidebar-user">
        <strong>{rol === "admin" ? "Administrador" : "Empleado"}</strong>
        <span>{email}</span>
        <button type="button" onClick={logout}><FiLogOut aria-hidden="true" />Cerrar sesión</button>
      </div>
    </>
  );

  return (
    <>
      <aside className="admin-sidebar admin-sidebar-desktop">{sidebarContent}</aside>
      <header className="admin-mobile-header">
        <div className="admin-mobile-brand">
          <img src={imagenesRefugio.logo} alt="" width="42" height="42" />
          <div><strong>Refugio La Arboleda</strong><span>{activeLabel}</span></div>
        </div>
        <button type="button" className="admin-mobile-menu-button" aria-label="Abrir menú administrativo"
          aria-expanded={menuOpen} aria-controls={drawerId} onClick={() => setMenuOpen(true)}>
          <FiMenu aria-hidden="true" />
        </button>
      </header>
      <dialog ref={drawerRef} id={drawerId} className="admin-mobile-drawer" aria-label="Menú administrativo"
        onCancel={(event) => { event.preventDefault(); setMenuOpen(false); }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = event.currentTarget.querySelectorAll("button:not(:disabled)");
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setMenuOpen(false);
        }}>
        <button type="button" className="admin-drawer-close" aria-label="Cerrar menú administrativo" autoFocus onClick={() => setMenuOpen(false)}>
          <FiX aria-hidden="true" />
        </button>
        <div className="admin-sidebar admin-drawer-content">{sidebarContent}</div>
      </dialog>
    </>
  );
}
