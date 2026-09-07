import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import { useConfirm } from "../components/ConfirmContext";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

function formatarData(iso) {
    return new Date(iso).toLocaleString("pt-BR");
}

// Fila de encomendas pendentes de validação (RF08) — só equipe autorizada
// a gerenciar peças (admin sempre, funcionário com pode_gerenciar_pecas).
// O backend (PodeGerenciarPecas) também recusa quem não tem acesso; esta
// checagem aqui é só pra não mostrar uma tela cujas ações vão dar 403.
function podeGerenciar(usuario) {
    return !!usuario && (usuario.tipo === "adm" || (usuario.tipo === "funcionario" && usuario.pode_gerenciar_pecas));
}

function Encomendas() {

    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));
    const showToast = useToast();
    const confirm = useConfirm();
    const [encomendas, setEncomendas] = useState([]);
    const [carregando, setCarregando] = useState(true);

    async function carregar() {
        setCarregando(true);
        try {
            const response = await api.get("encomendas/pendentes/");
            setEncomendas(response.data);
        } catch (error) {
            console.log(error);
            showToast("Erro ao carregar encomendas", "error");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function validar(encomenda, novoStatus) {
        const acaoTexto = novoStatus === "aprovada" ? "aprovar" : "recusar";
        if (!await confirm(`Confirma ${acaoTexto} a encomenda de ${encomenda.quantidade}x "${encomenda.peca_nome}"?`)) return;

        try {
            await api.patch(`encomendas/${encomenda.id}/validar/`, { status: novoStatus });
            showToast(`Encomenda ${novoStatus === "aprovada" ? "aprovada" : "recusada"} com sucesso.`, "success");
            carregar();
        } catch (error) {
            console.log(error);
            showToast("Erro ao validar encomenda", "error");
        }
    }

    if (!podeGerenciar(usuarioLogado)) {
        return (
            <div className="dashboard-layout">
                <Sidebar />
                <div className="dashboard-content">
                    <main className="dashboard-main">
                        <div className="catalogo-empty">Você não tem permissão para acessar esta tela.</div>
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
                        <h1>Encomendas</h1>
                        <p>Pedidos de encomenda aguardando validação</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="catalogo-toolbar">
                        <h2>{encomendas.length} encomenda(s) pendente(s)</h2>
                    </div>

                    <div className="catalogo-table-wrapper">
                        {carregando ? (
                            <div className="catalogo-empty">Carregando...</div>
                        ) : encomendas.length === 0 ? (
                            <div className="catalogo-empty">Nenhuma encomenda pendente no momento.</div>
                        ) : (
                            <table className="catalogo-table">
                                <thead>
                                    <tr>
                                        <th>Peça</th>
                                        <th>Cliente</th>
                                        <th>Quantidade</th>
                                        <th>Data</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {encomendas.map((encomenda) => (
                                        <tr key={encomenda.id}>
                                            <td>{encomenda.peca_nome}</td>
                                            <td>{encomenda.cliente_nome}</td>
                                            <td>{encomenda.quantidade}</td>
                                            <td>{formatarData(encomenda.criado_em)}</td>
                                            <td style={{ display: "flex", gap: "8px" }}>
                                                <button className="btn-success" onClick={() => validar(encomenda, "aprovada")}>
                                                    Aprovar
                                                </button>
                                                <button className="btn-danger" onClick={() => validar(encomenda, "recusada")}>
                                                    Recusar
                                                </button>
                                            </td>
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

export default Encomendas;
