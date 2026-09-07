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
                const pecasResp = await api.get("pecas/");

                setTotalPecas(pecasResp.data.length);
                setPecasParaRepor(
                    pecasResp.data.filter((p) => p.quantidade_estoque <= p.quantidade_minima).length
                );

                // Só admin vê o card de Usuários Ativos — funcionário e
                // cliente não têm por que enxergar quantos usuários
                // existem no sistema, e nem precisam chamar GET /api/usuarios/.
                if (usuario?.tipo === "adm") {
                    const usuariosResp = await api.get("usuarios/");
                    setUsuariosAtivos(usuariosResp.data.filter((u) => u.ativo).length);
                }
            } catch (error) {
                console.log(error);
            }
        }

        carregarEstatisticas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    function getSaudacao() {
        const hora = new Date().getHours();
        if (hora < 12) return "Bom dia";
        if (hora < 18) return "Boa tarde";
        return "Boa noite";
    }

    function getInitiais(nome) {
        if (!nome) return "U";
        const partes = nome.split(" ");
        if (partes.length >= 2) {
            return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
        }
        return partes[0][0].toUpperCase();
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
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <path d="M16 17l5-5-5-5" />
                                <path d="M21 12H9" />
                            </svg>
                            Sair
                        </button>
                    </div>
                </header>

                <main className="dashboard-main">

                    <div className="dashboard-welcome">
                        <div className="dashboard-welcome-avatar">{getInitiais(usuario.nome)}</div>
                        <div>
                            <h2>{getSaudacao()}, {usuario.nome.split(" ")[0]}!</h2>
                            <p>Aqui está o resumo do seu painel hoje.</p>
                        </div>
                    </div>

                    <div className="dashboard-stats">
                        <div className="stat-card">
                            <div className="stat-card-icon blue">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8Z" />
                                    <path d="M3.3 7.3 12 12l8.7-4.7" />
                                    <path d="M12 22V12" />
                                </svg>
                            </div>
                            <div className="stat-card-label">Peças no Catálogo</div>
                            <div className="stat-card-value">{totalPecas ?? "—"}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon red">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                    <path d="M12 9v4" />
                                    <path d="M12 17h.01" />
                                </svg>
                            </div>
                            <div className="stat-card-label">Peças para Repor</div>
                            <div className="stat-card-value">{pecasParaRepor ?? "—"}</div>
                        </div>
                        {usuario?.tipo === "adm" && (
                            <div className="stat-card">
                                <div className="stat-card-icon green">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div className="stat-card-label">Usuários Ativos</div>
                                <div className="stat-card-value">{usuariosAtivos ?? "—"}</div>
                            </div>
                        )}
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
                            <span className="info-row-value info-row-senha">
                                {senhaDigitada ? (
                                    <>
                                        <span>{mostrarSenha ? senhaDigitada : "•".repeat(senhaDigitada.length)}</span>
                                        <button
                                            type="button"
                                            className="btn-mostrar-senha-info"
                                            onClick={() => setMostrarSenha(!mostrarSenha)}
                                            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                                        >
                                            {mostrarSenha ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <path d="M1 1l22 22" />
                                                </svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <span
                                        className="info-row-senha-indisponivel"
                                        title="Disponível só logo após fazer login por senha nesta aba (não fica salva em disco)"
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
