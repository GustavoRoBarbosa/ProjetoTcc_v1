import { Link, useLocation } from "react-router-dom";
import "../css/Sidebar.css";

function Sidebar() {

    const location = useLocation();
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    function getInitiais(nome) {
        if (!nome) return "U";
        const partes = nome.split(" ");
        if (partes.length >= 2) {
            return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
        }
        return partes[0][0].toUpperCase();
    }

    return (
        <div className="sidebar">

            <div className="sidebar-brand">
                <Link to="/dashboard">
                    <div className="sidebar-brand-icon">G</div>
                    <div>
                        <h2>GRB OFICE</h2>
                        <div className="sidebar-brand-sub">Painel de Gestão</div>
                    </div>
                </Link>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-nav-label">Menu</div>
                <ul>
                    <li>
                        <Link
                            to="/dashboard"
                            className={location.pathname === "/dashboard" ? "active" : ""}
                        >
                            <span>Início</span>
                        </Link>
                    </li>
                </ul>
            </nav>

            {usuario && (
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {getInitiais(usuario.nome)}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{usuario.nome}</div>
                            <div className="sidebar-user-role">{usuario.tipo}</div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Sidebar;
