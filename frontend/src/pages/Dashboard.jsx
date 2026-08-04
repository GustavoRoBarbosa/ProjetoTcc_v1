import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { limparSenhaDigitada, obterSenhaDigitada } from "../services/sessaoSenha";
import "../css/Dashboard.css";

function Dashboard() {

    const navigate = useNavigate();

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const [mostrarSenha, setMostrarSenha] = useState(false);
    // Só existe se o login desta sessão foi por senha (não Google) e a
    // página não foi recarregada depois — ver services/sessaoSenha.js
    // pro porquê disso não vir do localStorage.
    const senhaDigitada = obterSenhaDigitada();

    // Os 3 cards eram só placeholder (sempre "—"). Agora puxam números
    // reais do catálogo/usuários — sem endpoint de estatística dedicado,
    // simplesmente busca as listas e conta no cliente (o volume de dados
    // do projeto não justifica um endpoint só pra isso ainda).
    const [totalPecas, setTotalPecas] = useState(null);
    const [pecasParaRepor, setPecasParaRepor] = useState(null);
    const [usuariosAtivos, setUsuariosAtivos] = useState(null);

    useEffect(() => {
        async function carregarEstatisticas() {
            try {
                const [pecasResp, usuariosResp] = await Promise.all([
                    api.get("pecas/"),
                    api.get("usuarios/"),
                ]);

                setTotalPecas(pecasResp.data.length);
                setPecasParaRepor(
                    pecasResp.data.filter((p) => p.quantidade_estoque <= p.quantidade_minima).length
                );
                setUsuariosAtivos(usuariosResp.data.filter((u) => u.ativo).length);
            } catch (error) {
                console.log(error);
            }
        }

        carregarEstatisticas();
    }, []);

    function sair() {
        // Limpa tudo que identifica a sessão — sem isso o PrivateRoute
        // continuaria deixando entrar no /dashboard mesmo após "sair".
        localStorage.removeItem("usuario");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        limparSenhaDigitada();
        navigate("/");
    }

    function getDataAtual() {
        const opcoes = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        return new Date().toLocaleDateString("pt-BR", opcoes);
    }

    return (
        <div className="dashboard-layout">

            <Sidebar />

            <div className="dashboard-content">

                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Início</h1>
                        <p>{getDataAtual()}</p>
                    </div>
                    <div className="dashboard-header-right">
                        <button className="btn-logout" onClick={sair}>
                            ⬅ Sair
                        </button>
                    </div>
                </header>

                <main className="dashboard-main">

                    <div className="dashboard-welcome">
                        <h2>Bem-vindo, {usuario.nome}!</h2>
                        <p>Aqui está o resumo do seu painel.</p>
                    </div>

                    <div className="dashboard-stats">
                        <div className="stat-card">
                            <div className="stat-card-icon blue">📦</div>
                            <div className="stat-card-label">Peças no Catálogo</div>
                            <div className="stat-card-value">{totalPecas ?? "—"}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon red">⚠️</div>
                            <div className="stat-card-label">Peças para Repor</div>
                            <div className="stat-card-value">{pecasParaRepor ?? "—"}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green">👥</div>
                            <div className="stat-card-label">Usuários Ativos</div>
                            <div className="stat-card-value">{usuariosAtivos ?? "—"}</div>
                        </div>
                    </div>

                    <div className="dashboard-info-card">
                        <h3>Informações do Usuário</h3>
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
                                <span className={`badge ${usuario.tipo === "adm" ? "badge-admin" : "badge-user"}`}>
                                    {usuario.tipo}
                                </span>
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

export default Dashboard;
