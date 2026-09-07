import { Link, useLocation } from "react-router-dom";
import "../css/Sidebar.css";

const Icone = {
    conta: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    carrinho: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
    ),
    historico: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
            <path d="M12 7v5l4 2" />
        </svg>
    ),
    loja: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l1.5-6h15L21 9" />
            <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
            <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
            <path d="M9 21v-6h6v6" />
        </svg>
    ),
    inicio: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5 12 3l9 6.5" />
            <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
        </svg>
    ),
    pecas: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
        </svg>
    ),
    categorias: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    fornecedores: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 3v5h-7V8Z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    usuarios: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    logs: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M9 13h6" />
            <path d="M9 17h6" />
        </svg>
    ),
    encomendas: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
        </svg>
    ),
    reservas: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
            <path d="M9 16l2 2 4-4" />
        </svg>
    ),
    configuracoes: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
    ),
};

// Mesmo critério usado em Pecas.jsx/Categorias.jsx/Fornecedores.jsx: admin
// sempre pode, funcionário só se autorizado — encomendas usa a mesma
// permissão do catálogo (PodeGerenciarPecas, ver backend.md).
function podeGerenciarPecas(usuario) {
    return !!usuario && (usuario.tipo === "adm" || (usuario.tipo === "funcionario" && usuario.pode_gerenciar_pecas));
}

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

    function ativo(caminho) {
        return location.pathname === caminho ? "active" : "";
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
                            <Link to="/minha-conta" className={ativo("/minha-conta")}>
                                <span className="sidebar-nav-icon">{Icone.conta}</span>
                                <span>Minha Conta</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/carrinho" className={ativo("/carrinho")}>
                                <span className="sidebar-nav-icon">{Icone.carrinho}</span>
                                <span>Carrinho</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/historico-compras" className={ativo("/historico-compras")}>
                                <span className="sidebar-nav-icon">{Icone.historico}</span>
                                <span>Histórico de Compras</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/">
                                <span className="sidebar-nav-icon">{Icone.loja}</span>
                                <span>Ofertas / Loja</span>
                            </Link>
                        </li>
                    </ul>
                ) : (
                    <ul>
                        <li>
                            <Link to="/dashboard" className={ativo("/dashboard")}>
                                <span className="sidebar-nav-icon">{Icone.inicio}</span>
                                <span>Início</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/pecas" className={ativo("/pecas")}>
                                <span className="sidebar-nav-icon">{Icone.pecas}</span>
                                <span>Peças</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/categorias" className={ativo("/categorias")}>
                                <span className="sidebar-nav-icon">{Icone.categorias}</span>
                                <span>Categorias</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/fornecedores" className={ativo("/fornecedores")}>
                                <span className="sidebar-nav-icon">{Icone.fornecedores}</span>
                                <span>Fornecedores</span>
                            </Link>
                        </li>
                        {podeGerenciarPecas(usuario) && (
                            <>
                                <li>
                                    <Link to="/encomendas" className={ativo("/encomendas")}>
                                        <span className="sidebar-nav-icon">{Icone.encomendas}</span>
                                        <span>Encomendas</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/reservas" className={ativo("/reservas")}>
                                        <span className="sidebar-nav-icon">{Icone.reservas}</span>
                                        <span>Reservas</span>
                                    </Link>
                                </li>
                            </>
                        )}
                        {usuario?.tipo === "adm" && (
                            <>
                                <li>
                                    <Link to="/usuarios" className={ativo("/usuarios")}>
                                        <span className="sidebar-nav-icon">{Icone.usuarios}</span>
                                        <span>Usuários</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/logs" className={ativo("/logs")}>
                                        <span className="sidebar-nav-icon">{Icone.logs}</span>
                                        <span>Log de Atividades</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/configuracoes" className={ativo("/configuracoes")}>
                                        <span className="sidebar-nav-icon">{Icone.configuracoes}</span>
                                        <span>Configurações</span>
                                    </Link>
                                </li>
                            </>
                        )}
                        <li>
                            <Link to="/">
                                <span className="sidebar-nav-icon">{Icone.loja}</span>
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
