import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { limparSenhaDigitada, obterSenhaDigitada } from "../services/sessaoSenha";
import "../css/Dashboard.css";

// "Início" de quem loga como cliente — bem diferente do Dashboard (que é
// uma tela de gestão pra adm/funcionario). Cliente só tem acesso às
// próprias informações, histórico de compras (placeholder por enquanto,
// sem sistema de pedidos ainda) e um link pra ver as ofertas (a própria
// vitrine pública). Ver PrivateRoute.jsx/App.js pra como isso é
// separado das telas de gestão.
function ContaCliente() {

    const navigate = useNavigate();
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const senhaDigitada = obterSenhaDigitada();

    function sair() {
        localStorage.removeItem("usuario");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        limparSenhaDigitada();
        navigate("/");
    }

    return (
        <div className="dashboard-layout">

            <Sidebar />

            <div className="dashboard-content">

                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Minha Conta</h1>
                        <p>Bem-vindo, {usuario.nome}!</p>
                    </div>
                    <div className="dashboard-header-right">
                        <button className="btn-logout" onClick={sair}>
                            ⬅ Sair
                        </button>
                    </div>
                </header>

                <main className="dashboard-main">

                    <div className="dashboard-stats">
                        <Link to="/" className="stat-card" style={{ textDecoration: "none" }}>
                            <div className="stat-card-icon blue">🛍️</div>
                            <div className="stat-card-label">Ofertas Disponíveis</div>
                            <div className="stat-card-value" style={{ fontSize: "15px" }}>Ver catálogo</div>
                        </Link>
                        <Link to="/historico-compras" className="stat-card" style={{ textDecoration: "none" }}>
                            <div className="stat-card-icon green">📦</div>
                            <div className="stat-card-label">Histórico de Compras</div>
                            <div className="stat-card-value" style={{ fontSize: "15px" }}>Ver pedidos</div>
                        </Link>
                    </div>

                    <div className="dashboard-info-card">
                        <h3>Minhas Informações</h3>
                        <div className="info-row">
                            <span className="info-row-label">Nome</span>
                            <span className="info-row-value">{usuario.nome}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-row-label">E-mail</span>
                            <span className="info-row-value">{usuario.email}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-row-label">Tipo</span>
                            <span className="info-row-value">
                                <span className="badge badge-user">{usuario.tipo}</span>
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-row-label">Senha</span>
                            <span className="info-row-value" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {senhaDigitada ? (
                                    <>
                                        <span>{mostrarSenha ? senhaDigitada : "•".repeat(senhaDigitada.length)}</span>
                                        <button
                                            type="button"
                                            onClick={() => setMostrarSenha(!mostrarSenha)}
                                            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
                                        >
                                            {mostrarSenha ? "🙈" : "👁"}
                                        </button>
                                    </>
                                ) : (
                                    <span
                                        title="Disponível só logo após fazer login por senha nesta aba (não fica salva em disco)"
                                        style={{ color: "var(--text-muted)", fontSize: "13px" }}
                                    >
                                        •••••••• (faça login novamente para visualizar)
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                </main>

            </div>

        </div>
    );
}

export default ContaCliente;
