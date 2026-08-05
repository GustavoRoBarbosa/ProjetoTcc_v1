import { Link, useLocation } from "react-router-dom";
import "../css/Sidebar.css";

function Sidebar() {

    const location = useLocation();
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const ehCliente = usuario?.tipo === "cliente";

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
                <Link to={ehCliente ? "/minha-conta" : "/dashboard"}>
                    <div className="sidebar-brand-icon">G</div>
                    <div>
                        <h2>GRB OFICE</h2>
                        <div className="sidebar-brand-sub">
                            {ehCliente ? "Área do Cliente" : "Painel de Gestão"}
                        </div>
                    </div>
                </Link>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-nav-label">Menu</div>
                {/* Cliente não tem acesso às telas de gestão (peças,
                    categorias, fornecedores, usuários, log) — só à
                    própria conta, histórico de compras e à vitrine
                    pública. Ver .claude/docs/frontend.md pro porquê. */}
                {ehCliente ? (
                    <ul>
                        <li>
                            <Link
                                to="/minha-conta"
                                className={location.pathname === "/minha-conta" ? "active" : ""}
                            >
                                <span>Minha Conta</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/carrinho"
                                className={location.pathname === "/carrinho" ? "active" : ""}
                            >
                                <span>Carrinho</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/historico-compras"
                                className={location.pathname === "/historico-compras" ? "active" : ""}
                            >
                                <span>Histórico de Compras</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/">
                                <span>Ofertas / Loja</span>
                            </Link>
                        </li>
                    </ul>
                ) : (
                    <ul>
                        <li>
                            <Link
                                to="/dashboard"
                                className={location.pathname === "/dashboard" ? "active" : ""}
                            >
                                <span>Início</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/pecas"
                                className={location.pathname === "/pecas" ? "active" : ""}
                            >
                                <span>Peças</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/categorias"
                                className={location.pathname === "/categorias" ? "active" : ""}
                            >
                                <span>Categorias</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/fornecedores"
                                className={location.pathname === "/fornecedores" ? "active" : ""}
                            >
                                <span>Fornecedores</span>
                            </Link>
                        </li>
                        {usuario?.tipo === "adm" && (
                            <>
                                <li>
                                    <Link
                                        to="/usuarios"
                                        className={location.pathname === "/usuarios" ? "active" : ""}
                                    >
                                        <span>Usuários</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/logs"
                                        className={location.pathname === "/logs" ? "active" : ""}
                                    >
                                        <span>Log de Atividades</span>
                                    </Link>
                                </li>
                            </>
                        )}
                        <li>
                            <Link to="/">
                                <span>Ver Loja</span>
                            </Link>
                        </li>
                    </ul>
                )}
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
