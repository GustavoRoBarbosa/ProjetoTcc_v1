import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

function formatarData(iso) {
    return new Date(iso).toLocaleString("pt-BR");
}

// Lista os pedidos já finalizados do usuário logado (GET /api/pedidos/,
// ver backend/pedidos/views.py::listar_pedidos). Cada pedido guarda o
// "retrato" do preço/nome de cada peça no momento da compra, então o
// histórico não muda retroativamente se a peça for editada depois.
function HistoricoCompras() {

    const [pedidos, setPedidos] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        async function carregar() {
            try {
                const response = await api.get("pedidos/");
                setPedidos(response.data);
            } catch (error) {
                console.log(error);
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, []);

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
                                    <h3>
                                        Pedido #{pedido.id} — {formatarData(pedido.criado_em)}
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
                </main>
            </div>
        </div>
    );
}

export default HistoricoCompras;
