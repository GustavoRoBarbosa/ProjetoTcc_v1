import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LojaHeader from "../components/LojaHeader";
import api from "../services/api";
import "../css/Loja.css";

// Página de detalhe de um produto (estilo Mercado Livre), aberta ao
// clicar num card da vitrine (Loja.jsx). Continua pública — quem não
// tem conta consegue ver os detalhes; só "Comprar" exige login. Quem já
// está logado, "Comprar" adiciona ao carrinho na hora.
function LojaProduto() {

    const { id } = useParams();
    const navigate = useNavigate();
    const [peca, setPeca] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [adicionando, setAdicionando] = useState(false);

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
            const response = await api.post("carrinho/itens/", { peca_id: peca.id, quantidade: 1 });
            if (response.data.success) {
                navigate("/carrinho");
            } else {
                alert(response.data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Erro ao adicionar ao carrinho");
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
                            <p className="loja-produto-codigo">Código: {peca.codigo}</p>

                            <p className="loja-produto-preco">
                                R$ {Number(peca.preco).toFixed(2)}
                            </p>

                            {!peca.disponivel && (
                                <span className="loja-card-esgotado" style={{ position: "static", display: "inline-block", marginBottom: "12px" }}>
                                    Esgotado
                                </span>
                            )}

                            <button
                                className="loja-btn-primary loja-produto-comprar"
                                onClick={comprar}
                                disabled={!peca.disponivel || adicionando}
                            >
                                {!peca.disponivel ? "Indisponível" : adicionando ? "Adicionando..." : "Comprar"}
                            </button>

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
