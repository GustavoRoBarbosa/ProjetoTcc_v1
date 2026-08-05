import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LojaHeader from "../components/LojaHeader";
import api from "../services/api";
import "../css/Loja.css";

// Página inicial pública do site (rota "/"), no espírito de uma home de
// marketplace (Mercado Livre etc.): mostra o catálogo pra qualquer
// visitante, sem precisar de conta. Clicar num produto abre a página de
// detalhe (LojaProduto.jsx) — só o botão "Comprar" de lá manda pro login,
// já que ainda não existe carrinho/checkout implementado.
function Loja() {

    const navigate = useNavigate();
    const [pecas, setPecas] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        async function carregar() {
            try {
                const response = await api.get("loja/pecas/");
                setPecas(response.data);
            } catch (error) {
                console.log(error);
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, []);

    return (
        <div className="loja-page">
            <LojaHeader />

            <main className="loja-main">
                <div className="loja-hero">
                    <h1>Peças de qualidade para sua oficina</h1>
                    <p>Confira nosso catálogo — faça login ou crie sua conta para comprar.</p>
                </div>

                <div className="loja-grid-titulo">
                    <h2>Peças disponíveis</h2>
                </div>

                {carregando ? (
                    <div className="loja-vazio">Carregando catálogo...</div>
                ) : pecas.length === 0 ? (
                    <div className="loja-vazio">Nenhuma peça disponível no momento.</div>
                ) : (
                    <div className="loja-grid">
                        {pecas.map((peca) => (
                            <button
                                key={peca.id}
                                className="loja-card"
                                onClick={() => navigate(`/produto/${peca.id}`)}
                                type="button"
                            >
                                <div className="loja-card-imagem">
                                    {peca.imagem ? (
                                        <img src={peca.imagem} alt={peca.nome} />
                                    ) : (
                                        <div className="loja-card-imagem-vazia">Sem imagem</div>
                                    )}
                                    {!peca.disponivel && (
                                        <span className="loja-card-esgotado">Esgotado</span>
                                    )}
                                </div>
                                <div className="loja-card-corpo">
                                    {peca.categoria_nome && (
                                        <span className="loja-card-categoria">{peca.categoria_nome}</span>
                                    )}
                                    <h3 className="loja-card-nome">{peca.nome}</h3>
                                    <p className="loja-card-preco">
                                        R$ {Number(peca.preco).toFixed(2)}
                                    </p>
                                    <span className="loja-card-comprar">Comprar</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            <footer className="loja-footer">
                <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
            </footer>
        </div>
    );
}

export default Loja;
