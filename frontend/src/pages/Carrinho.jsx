import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LojaHeader from "../components/LojaHeader";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import { useConfirm } from "../components/ConfirmContext";
import "../css/Loja.css";
import "../css/Carrinho.css";
import "../css/Dashboard.css";

function Carrinho() {

    const navigate = useNavigate();
    const showToast = useToast();
    const confirm = useConfirm();
    const [carrinho, setCarrinho] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [finalizando, setFinalizando] = useState(false);
    const [reservando, setReservando] = useState(false);
    // Admin pode ligar/desligar a reserva a qualquer momento (ver
    // Configuracoes.jsx e backend/pedidos/views.py::configuracoes) —
    // default true enquanto a chamada não volta, pra não "piscar"
    // escondendo o botão à toa numa conexão lenta.
    const [reservaHabilitada, setReservaHabilitada] = useState(true);

    async function carregar() {
        setCarregando(true);
        try {
            const [respostaCarrinho, respostaConfig] = await Promise.all([
                api.get("carrinho/"),
                api.get("configuracoes/"),
            ]);
            setCarrinho(respostaCarrinho.data);
            setReservaHabilitada(respostaConfig.data.reserva_habilitada);
        } catch (error) {
            console.log(error);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function alterarQuantidade(item, novaQuantidade) {
        try {
            const response = await api.patch(`carrinho/itens/${item.id}/`, { quantidade: novaQuantidade });
            if (response.data.success) {
                setCarrinho(response.data.carrinho);
            } else {
                showToast(response.data.message, "error");
            }
        } catch (error) {
            console.log(error);
            showToast("Erro ao atualizar o carrinho", "error");
        }
    }

    async function removerItem(item) {
        try {
            const response = await api.delete(`carrinho/itens/${item.id}/`);
            setCarrinho(response.data.carrinho);
        } catch (error) {
            console.log(error);
            showToast("Erro ao remover item", "error");
        }
    }

    // "Finalizar pedido" agora abre o checkout do Stripe (modo teste — ver
    // backend/pedidos/views.py::criar_sessao_checkout). O Pedido só é
    // criado de verdade depois que o Stripe confirma o pagamento, na
    // página de retorno (PagamentoSucesso.jsx) — aqui só pedimos a sessão
    // e redirecionamos o navegador inteiro pra lá (é assim que o Stripe
    // Checkout hospedado funciona, sem precisar de biblioteca no frontend).
    async function irParaPagamento() {
        setFinalizando(true);
        try {
            const response = await api.post("carrinho/checkout/");
            if (response.data.success) {
                window.location.href = response.data.url;
            } else {
                showToast(response.data.message, "error");
                carregar(); // estoque pode ter mudado — recarrega o carrinho atualizado
                setFinalizando(false);
            }
        } catch (error) {
            console.log(error);
            showToast("Erro ao iniciar o pagamento", "error");
            setFinalizando(false);
        }
    }

    // Reserva separa a peça em estoque sem pagar agora (RF06) — sem
    // prazo de expiração; só a equipe pode cancelar manualmente pra
    // liberar o estoque de novo (ver backend/pedidos/views.py::cancelar_reserva).
    async function reservar() {
        if (!await confirm("Reservar os itens do carrinho? Sem prazo de validade — pague e retire na loja.")) return;

        setReservando(true);
        try {
            const response = await api.post("carrinho/reservar/");
            if (response.data.success) {
                showToast(`Reserva #${response.data.pedido.id} feita com sucesso!`, "success");
                navigate("/historico-compras");
            } else {
                showToast(response.data.message, "error");
                carregar();
            }
        } catch (error) {
            console.log(error);
            showToast("Erro ao reservar os itens", "error");
        } finally {
            setReservando(false);
        }
    }

    const itens = carrinho?.itens || [];

    return (
        <div className="loja-page">
            <LojaHeader />

            <main className="loja-main">
                <Link to="/" className="loja-voltar">← Continuar comprando</Link>

                <h1 className="carrinho-titulo">Meu Carrinho</h1>

                {carregando ? (
                    <div className="loja-vazio">Carregando carrinho...</div>
                ) : itens.length === 0 ? (
                    <div className="loja-vazio">
                        Seu carrinho está vazio.{" "}
                        <Link to="/" style={{ textDecoration: "underline" }}>Ver ofertas</Link>
                    </div>
                ) : (
                    <div className="carrinho-layout">
                        <div className="carrinho-itens">
                            {itens.map((item) => (
                                <div className="carrinho-item" key={item.id}>
                                    <div className="carrinho-item-imagem">
                                        {item.peca_imagem ? (
                                            <img src={item.peca_imagem} alt={item.peca_nome} />
                                        ) : (
                                            <div className="loja-card-imagem-vazia">Sem imagem</div>
                                        )}
                                    </div>
                                    <div className="carrinho-item-info">
                                        <h3>{item.peca_nome}</h3>
                                        <p>R$ {Number(item.preco_unitario).toFixed(2)} / unidade</p>
                                    </div>
                                    <div className="carrinho-item-quantidade">
                                        <button type="button" onClick={() => alterarQuantidade(item, item.quantidade - 1)}>−</button>
                                        <span>{item.quantidade}</span>
                                        <button type="button" onClick={() => alterarQuantidade(item, item.quantidade + 1)}>+</button>
                                    </div>
                                    <div className="carrinho-item-subtotal">
                                        R$ {Number(item.subtotal).toFixed(2)}
                                    </div>
                                    <button
                                        type="button"
                                        className="carrinho-item-remover"
                                        onClick={() => removerItem(item)}
                                        aria-label="Remover item"
                                    >
                                        🗑
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="carrinho-resumo">
                            <h2>Resumo</h2>
                            <div className="carrinho-resumo-linha">
                                <span>Total</span>
                                <strong>R$ {Number(carrinho.total).toFixed(2)}</strong>
                            </div>
                            <button
                                className="loja-btn-primary"
                                style={{ width: "100%", padding: "12px", marginTop: "16px" }}
                                onClick={irParaPagamento}
                                disabled={finalizando || reservando}
                            >
                                {finalizando ? "Redirecionando..." : "Ir para pagamento"}
                            </button>
                            {reservaHabilitada && (
                                <button
                                    className="btn-info"
                                    style={{ width: "100%", padding: "12px", marginTop: "10px" }}
                                    onClick={reservar}
                                    disabled={finalizando || reservando}
                                >
                                    {reservando ? "Reservando..." : "Reservar (pagar depois)"}
                                </button>
                            )}
                            <p className="carrinho-resumo-aviso">
                                Pagamento simulado via Stripe (modo teste) — nenhum valor real é cobrado.
                                {reservaHabilitada && " Reservar separa o item sem pagar agora, sem prazo de validade."}
                            </p>
                        </div>
                    </div>
                )}
            </main>

            <footer className="loja-footer">
                <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
            </footer>
        </div>
    );
}

export default Carrinho;
