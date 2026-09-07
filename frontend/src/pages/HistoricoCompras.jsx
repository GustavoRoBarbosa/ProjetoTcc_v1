import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

function formatarData(iso) {
    return new Date(iso).toLocaleString("pt-BR");
}

const ROTULO_STATUS_PEDIDO = {
    concluido: "Pago",
    reservado: "Reservado",
    cancelado: "Cancelado",
};

const BADGE_STATUS_PEDIDO = {
    concluido: "badge-success",
    reservado: "badge-user",
    cancelado: "badge-danger",
};

const ROTULO_STATUS_ENCOMENDA = {
    pendente: "Aguardando validação",
    aprovada: "Aprovada",
    recusada: "Recusada",
    concluida: "Concluída",
};

const BADGE_STATUS_ENCOMENDA = {
    pendente: "badge-pendente",
    aprovada: "badge-user",
    recusada: "badge-danger",
    concluida: "badge-success",
};

// Lista os pedidos já finalizados do usuário logado (GET /api/pedidos/,
// ver backend/pedidos/views.py::listar_pedidos). Cada pedido guarda o
// "retrato" do preço/nome de cada peça no momento da compra, então o
// histórico não muda retroativamente se a peça for editada depois.
// Também mostra as encomendas do cliente (RF07) e seu status de
// validação pela equipe (GET /api/encomendas/minhas/).
function HistoricoCompras() {

    const navigate = useNavigate();
    const showToast = useToast();
    const [pedidos, setPedidos] = useState([]);
    const [encomendas, setEncomendas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [comprando, setComprando] = useState(null);

    useEffect(() => {
        async function carregar() {
            try {
                const [respostaPedidos, respostaEncomendas] = await Promise.all([
                    api.get("pedidos/"),
                    api.get("encomendas/minhas/"),
                ]);
                setPedidos(respostaPedidos.data);
                setEncomendas(respostaEncomendas.data);
            } catch (error) {
                console.log(error);
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, []);

    // Encomenda aprovada = a peça foi providenciada (o backend já somou a
    // quantidade ao estoque, ver pedidos/views.py::validar_encomenda) —
    // "ir pra tela de pagamento" aqui é adicionar ao carrinho e navegar
    // pra /carrinho, que é o checkout real do projeto (sem gateway de
    // pagamento de verdade, ver known-issues.md).
    async function comprarEncomenda(encomenda) {
        setComprando(encomenda.id);
        try {
            const response = await api.post("carrinho/itens/", {
                peca_id: encomenda.peca,
                quantidade: encomenda.quantidade,
                encomenda_id: encomenda.id,
            });
            if (response.data.success) {
                navigate("/carrinho");
            } else {
                showToast(response.data.message, "error");
            }
        } catch (error) {
            console.log(error);
            showToast("Erro ao adicionar ao carrinho", "error");
        } finally {
            setComprando(null);
        }
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-content">
                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Histórico de Compras</h1>
                        <p>Seus pedidos anteriores</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    {carregando ? (
                        <div className="catalogo-empty">Carregando...</div>
                    ) : pedidos.length === 0 ? (
                        <div className="catalogo-empty">
                            Você ainda não tem nenhuma compra registrada.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {pedidos.map((pedido) => (
                                <div key={pedido.id} className="dashboard-info-card">
                                    <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        Pedido #{pedido.id} — {formatarData(pedido.criado_em)}
                                        <span className={`badge ${BADGE_STATUS_PEDIDO[pedido.status] || "badge-user"}`}>
                                            {ROTULO_STATUS_PEDIDO[pedido.status] || pedido.status}
                                        </span>
                                    </h3>
                                    {pedido.itens.map((item) => (
                                        <div className="info-row" key={item.id}>
                                            <span className="info-row-label">
                                                {item.quantidade}x {item.peca_nome}
                                            </span>
                                            <span className="info-row-value">
                                                R$ {Number(item.preco_unitario * item.quantidade).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="info-row">
                                        <span className="info-row-label"><strong>Total</strong></span>
                                        <span className="info-row-value">
                                            <strong>R$ {Number(pedido.total).toFixed(2)}</strong>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <h2 style={{ marginTop: "32px" }}>Minhas Encomendas</h2>
                    {carregando ? (
                        <div className="catalogo-empty">Carregando...</div>
                    ) : encomendas.length === 0 ? (
                        <div className="catalogo-empty">Você ainda não fez nenhuma encomenda.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {encomendas.map((encomenda) => (
                                <div key={encomenda.id} className="dashboard-info-card">
                                    <div className="info-row">
                                        <span className="info-row-label">
                                            {encomenda.quantidade}x {encomenda.peca_nome} — {formatarData(encomenda.criado_em)}
                                        </span>
                                        <span className="info-row-value" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span className={`badge ${BADGE_STATUS_ENCOMENDA[encomenda.status] || "badge-user"}`}>
                                                {ROTULO_STATUS_ENCOMENDA[encomenda.status] || encomenda.status}
                                            </span>
                                            {encomenda.status === "aprovada" && (
                                                <button
                                                    className="btn-info"
                                                    onClick={() => comprarEncomenda(encomenda)}
                                                    disabled={comprando === encomenda.id}
                                                >
                                                    {comprando === encomenda.id ? "Adicionando..." : "Comprar agora"}
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default HistoricoCompras;
