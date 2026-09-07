import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LojaHeader from "../components/LojaHeader";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import "../css/Loja.css";

// Página de detalhe de um produto (estilo Mercado Livre), aberta ao
// clicar num card da vitrine (Loja.jsx). Continua pública — quem não
// tem conta consegue ver os detalhes; só "Comprar" exige login. Quem já
// está logado, "Comprar" adiciona ao carrinho na hora.
function LojaProduto() {

    const { id } = useParams();
    const navigate = useNavigate();
    const showToast = useToast();
    const [peca, setPeca] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [adicionando, setAdicionando] = useState(false);
    const [quantidade, setQuantidade] = useState(1);

    function alterarQuantidade(delta) {
        setQuantidade((atual) => Math.max(1, atual + delta));
    }

    function editarQuantidade(valor) {
        const numero = parseInt(valor, 10);
        setQuantidade(Number.isNaN(numero) ? 1 : Math.max(1, numero));
    }

    useEffect(() => {
        async function carregar() {
            setCarregando(true);
            setErro(false);
            try {
                const response = await api.get(`loja/pecas/${id}/`);
                setPeca(response.data);
            } catch (error) {
                console.log(error);
                setErro(true);
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, [id]);

    async function comprar() {
        const usuarioLogado = localStorage.getItem("usuario");

        if (!usuarioLogado) {
            // Manda pro login e volta pra cá depois — ver Login.jsx
            // (proximaRota/?next=).
            navigate(`/login?next=/produto/${id}`);
            return;
        }

        setAdicionando(true);
        try {
            const response = await api.post("carrinho/itens/", { peca_id: peca.id, quantidade });
            if (response.data.success) {
                // Pediu mais do que o estoque tinha: o backend compra o
                // que dá e encomenda o resto sozinho (ver
                // backend/pedidos/views.py::adicionar_item) — avisa o
                // cliente com os detalhes antes de navegar.
                if (response.data.encomenda_criada) {
                    showToast(response.data.message, "info");
                }
                navigate("/carrinho");
            } else {
                showToast(response.data.message, "error");
            }
        } catch (error) {
            console.log(error);
            showToast("Erro ao adicionar ao carrinho", "error");
        } finally {
            setAdicionando(false);
        }
    }

    async function encomendar() {
        const usuarioLogado = localStorage.getItem("usuario");

        if (!usuarioLogado) {
            navigate(`/login?next=/produto/${id}`);
            return;
        }

        setAdicionando(true);
        try {
            const response = await api.post("encomendas/", { peca_id: peca.id, quantidade });
            if (response.data.success) {
                showToast("Encomenda registrada! Acompanhe o status em Histórico de Compras.", "success");
                navigate("/historico-compras");
            } else {
                showToast(response.data.message, "error");
            }
        } catch (error) {
            console.log(error);
            showToast("Erro ao registrar encomenda", "error");
        } finally {
            setAdicionando(false);
        }
    }

    return (
        <div className="loja-page">
            <LojaHeader />

            <main className="loja-main">
                <Link to="/" className="loja-voltar">← Voltar ao catálogo</Link>

                {carregando ? (
                    <div className="loja-vazio">Carregando produto...</div>
                ) : erro || !peca ? (
                    <div className="loja-vazio">
                        Produto não encontrado — ele pode ter sido removido do catálogo.
                    </div>
                ) : (
                    <div className="loja-produto">
                        <div className="loja-produto-imagem">
                            {peca.imagem ? (
                                <img src={peca.imagem} alt={peca.nome} />
                            ) : (
                                <div className="loja-card-imagem-vazia">Sem imagem</div>
                            )}
                        </div>

                        <div className="loja-produto-info">
                            {peca.categoria_nome && (
                                <span className="loja-card-categoria">{peca.categoria_nome}</span>
                            )}
                            <h1>{peca.nome}</h1>

                            <p className="loja-produto-preco">
                                R$ {Number(peca.preco).toFixed(2)}
                            </p>

                            <p className={`loja-produto-disponibilidade ${peca.disponivel ? "disponivel" : "esgotado"}`}>
                                {peca.disponivel ? "Em estoque" : "Esgotado — disponível para encomenda"}
                            </p>

                            <div className="loja-produto-quantidade-linha">
                                <label htmlFor="quantidade">Quantidade</label>
                                <div className="loja-stepper">
                                    <button
                                        type="button"
                                        onClick={() => alterarQuantidade(-1)}
                                        disabled={quantidade <= 1}
                                        aria-label="Diminuir quantidade"
                                    >
                                        −
                                    </button>
                                    <input
                                        id="quantidade"
                                        type="number"
                                        min="1"
                                        value={quantidade}
                                        onChange={(e) => editarQuantidade(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => alterarQuantidade(1)}
                                        aria-label="Aumentar quantidade"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {peca.disponivel ? (
                                <button
                                    className="loja-btn-primary loja-produto-comprar"
                                    onClick={comprar}
                                    disabled={adicionando}
                                >
                                    {adicionando ? "Adicionando..." : "Comprar"}
                                </button>
                            ) : (
                                <button
                                    className="loja-btn-primary loja-produto-comprar"
                                    onClick={encomendar}
                                    disabled={adicionando}
                                >
                                    {adicionando ? "Enviando..." : "Encomendar"}
                                </button>
                            )}

                            <div className="loja-produto-descricao">
                                <h2>Descrição</h2>
                                <p>{peca.descricao || "Sem descrição disponível."}</p>
                            </div>
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

export default LojaProduto;
