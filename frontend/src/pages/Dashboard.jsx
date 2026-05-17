import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../css/Dashboard.css";

function Dashboard() {

    const navigate = useNavigate();

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    function sair() {
        localStorage.removeItem("usuario");
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
                            <div className="stat-card-icon red">📋</div>
                            <div className="stat-card-label">Tarefas Pendentes</div>
                            <div className="stat-card-value">—</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon blue">👥</div>
                            <div className="stat-card-label">Usuários Ativos</div>
                            <div className="stat-card-value">—</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green">✅</div>
                            <div className="stat-card-label">Concluídas</div>
                            <div className="stat-card-value">—</div>
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
                                <span className={`badge ${usuario.tipo === "admin" ? "badge-admin" : "badge-user"}`}>
                                    {usuario.tipo}
                                </span>
                            </span>
                        </div>
                    </div>

                </main>

            </div>

        </div>
    );
}

export default Dashboard;
