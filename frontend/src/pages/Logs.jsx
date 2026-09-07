import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

function ehAdmin(usuario) {
    return !!usuario && usuario.tipo === "adm";
}

const ROTULO_ACAO = {
    criar: "Criou",
    editar: "Editou",
    excluir: "Excluiu",
};

function formatarData(iso) {
    return new Date(iso).toLocaleString("pt-BR");
}

function Logs() {

    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));
    const showToast = useToast();
    const [logs, setLogs] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        async function carregar() {
            try {
                const response = await api.get("logs/");
                setLogs(response.data);
            } catch (error) {
                console.log(error);
                showToast("Erro ao carregar o log de atividades", "error");
            } finally {
                setCarregando(false);
            }
        }

        if (ehAdmin(usuarioLogado)) {
            carregar();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!ehAdmin(usuarioLogado)) {
        return (
            <div className="dashboard-layout">
                <Sidebar />
                <div className="dashboard-content">
                    <main className="dashboard-main">
                        <div className="catalogo-empty">Só administradores acessam esta tela.</div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-content">
                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Log de Atividades</h1>
                        <p>Quem fez o quê e quando, no catálogo e nas contas de usuário</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="catalogo-toolbar">
                        <h2>{logs.length} registro(s)</h2>
                    </div>

                    <div className="catalogo-table-wrapper">
                        {carregando ? (
                            <div className="catalogo-empty">Carregando...</div>
                        ) : logs.length === 0 ? (
                            <div className="catalogo-empty">Nenhuma atividade registrada ainda.</div>
                        ) : (
                            <table className="catalogo-table">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Usuário</th>
                                        <th>Ação</th>
                                        <th>Registro</th>
                                        <th>Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{formatarData(log.criado_em)}</td>
                                            <td>{log.usuario_nome}</td>
                                            <td>{ROTULO_ACAO[log.acao] || log.acao}</td>
                                            <td>{log.modelo} #{log.objeto_id}</td>
                                            <td>{log.descricao || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Logs;
