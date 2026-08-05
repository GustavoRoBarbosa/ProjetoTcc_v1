import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LojaHeader from "../components/LojaHeader";
import api from "../services/api";
import "../css/Loja.css";
import "../css/Carrinho.css";

function Carrinho() {

    const navigate = useNavigate();
    const [carrinho, setCarrinho] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [finalizando, setFinalizando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            const response = await api.get("carrinho/");
            setCarrinho(response.data);
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
                alert(response.data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Erro ao atualizar o carrinho");
        }
    }

    async function removerItem(item) {
        try {
            const response = await api.delete(`carrinho/itens/${item.id}/`);
            setCarrinho(response.data.carrinho);
        } catch (error) {
            console.log(error);
            alert("Erro ao remover item");
        }
    }

    async function finalizarPedido() {
        setFinalizando(true);
        try {
            const response = await api.post("carrinho/finalizar/");
            if (response.data.success) {
                alert(`Pedido #${response.data.pedido.id} finalizado com sucesso!`);
                navigate("/historico-compras");
            } else {
                alert(response.data.message);
                carregar(); // estoque pode ter mudado — recarrega o carrinho atualizado
            }
        } catch (error) {
            console.log(error);
            alert("Erro ao finalizar pedido");
        } finally {
            setFinalizando(false);
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
                                onClick={finalizarPedido}
                                disabled={finalizando}
                            >
                                {finalizando ? "Finalizando..." : "Finalizar pedido"}
                            </button>
                            <p className="carrinho-resumo-aviso">
                                Sem pagamento integrado ainda — finalizar registra o pedido
                                normalmente e reserva o estoque.
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
