import Admin from "./components/Admin";
import PublicPage from "./components/PublicPage";
import ReservaPago from "./components/ReservaPago";

function App() {
  const ruta = window.location.pathname;

  if (ruta === "/admin") return <Admin />;
  if (ruta === "/reserva-pago") return <ReservaPago />;

  return <PublicPage />;
}

export default App;