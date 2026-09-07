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

// Mesmo critério usado em Pecas.jsx/Encomendas.jsx: admin sempre pode,
// funcionário só se autorizado (PodeGerenciarPecas no backend).
function podeGerenciar(usuario) {
    return !!usuario && (usuario.tipo === "adm" || (usuario.tipo === "funcionario" && usuario.pode_gerenciar_pecas));
}

// Reservas ativas (RF06) — sem prazo de expiração automática (decisão de
// escopo do TCC), então a única forma de liberar o estoque de uma
// reserva não retirada é a equipe cancelar manualmente aqui.
function Reservas() {

    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));
    const showToast = useToast();
    const confirm = useConfirm();
    const [reservas, setReservas] = useState([]);
    const [carregando, setCarregando] = useState(true);

    async function carregar() {
        setCarregando(true);
        try {
            const response = await api.get("reservas/");
            setReservas(response.data);
        } catch (error) {
            console.log(error);
            showToast("Erro ao carregar reservas", "error");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function cancelar(reserva) {
        if (!await confirm(`Cancelar a reserva #${reserva.id} de ${reserva.usuario_nome}? O estoque será devolvido.`)) return;

        try {
            await api.patch(`reservas/${reserva.id}/cancelar/`);
            showToast("Reserva cancelada e estoque devolvido.", "success");
            carregar();
        } catch (error) {
            console.log(error);
            showToast("Erro ao cancelar reserva", "error");
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
                        <h1>Reservas</h1>
                        <p>Peças separadas para retirada — sem prazo de validade</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="catalogo-toolbar">
                        <h2>{reservas.length} reserva(s) ativa(s)</h2>
                    </div>

                    <div className="catalogo-table-wrapper">
                        {carregando ? (
                            <div className="catalogo-empty">Carregando...</div>
                        ) : reservas.length === 0 ? (
                            <div className="catalogo-empty">Nenhuma reserva ativa no momento.</div>
                        ) : (
                            <table className="catalogo-table">
                                <thead>
                                    <tr>
                                        <th>Reserva</th>
                                        <th>Cliente</th>
                                        <th>Itens</th>
                                        <th>Total</th>
                                        <th>Data</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservas.map((reserva) => (
                                        <tr key={reserva.id}>
                                            <td>#{reserva.id}</td>
                                            <td>{reserva.usuario_nome || "—"}</td>
                                            <td>
                                                {reserva.itens.map((item) => (
                                                    <div key={item.id}>{item.quantidade}x {item.peca_nome}</div>
                                                ))}
                                            </td>
                                            <td>R$ {Number(reserva.total).toFixed(2)}</td>
                                            <td>{formatarData(reserva.criado_em)}</td>
                                            <td>
                                                <button className="btn-danger" onClick={() => cancelar(reserva)}>
                                                    Cancelar
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

export default Reservas;
