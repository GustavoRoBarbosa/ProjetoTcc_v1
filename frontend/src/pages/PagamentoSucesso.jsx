import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import LojaHeader from "../components/LojaHeader";
import api from "../services/api";
import "../css/Loja.css";

// Página de retorno do Stripe Checkout (success_url, ver
// backend/pedidos/views.py::criar_sessao_checkout). O Stripe substitui
// {CHECKOUT_SESSION_ID} pelo id real da sessão antes de redirecionar o
// navegador pra cá — por isso lemos `session_id` da URL.
//
// O Pedido só é criado de fato aqui, depois de confirmar com o backend
// (que confere direto com a API do Stripe se o pagamento foi mesmo
// aprovado) — nunca confiamos só no fato de o navegador ter chegado
// nesta URL, já que qualquer um poderia digitar essa URL sem pagar nada.
function PagamentoSucesso() {

    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [estado, setEstado] = useState("carregando"); // carregando | sucesso | erro
    const [mensagem, setMensagem] = useState("");
    const [pedido, setPedido] = useState(null);
    // O React (modo desenvolvimento/StrictMode) roda o efeito duas vezes
    // de propósito, pra pegar efeitos colaterais mal-comportados. Sem
    // essa guarda, a confirmação era chamada duas vezes quase juntas — a
    // segunda batia num pedido já criado pela primeira, e sua resposta
    // (mesmo tratada como sucesso no backend) chegava depois e podia
    // reescrever o estado da tela por cima do resultado certo.
    const jaConfirmou = useRef(false);

    useEffect(() => {
        async function confirmar() {
            if (jaConfirmou.current) return;
            jaConfirmou.current = true;

            if (!sessionId) {
                setEstado("erro");
                setMensagem("Sessão de pagamento não encontrada na URL.");
                return;
            }

            try {
                const response = await api.post("carrinho/confirmar-pagamento/", { session_id: sessionId });
                if (response.data.success) {
                    setPedido(response.data.pedido);
                    setEstado("sucesso");
                } else {
                    setEstado("erro");
                    setMensagem(response.data.message);
                }
            } catch (error) {
                console.log(error);
                setEstado("erro");
                setMensagem("Erro ao confirmar o pagamento com o servidor.");
            }
        }

        confirmar();
    }, [sessionId]);

    return (
        <div className="loja-page">
            <LojaHeader />

            <main className="loja-main">
                <div className="loja-vazio" style={{ textAlign: "center" }}>
                    {estado === "carregando" && <p>Confirmando seu pagamento...</p>}

                    {estado === "sucesso" && pedido && (
                        <>
                            <h2 style={{ color: "#16a34a" }}>Pagamento confirmado!</h2>
                            <p>
                                Pedido #{pedido.id} finalizado com sucesso — total de R$ {Number(pedido.total).toFixed(2)}.
                            </p>
                            <Link to="/historico-compras" style={{ textDecoration: "underline" }}>
                                Ver histórico de compras
                            </Link>
                        </>
                    )}

                    {estado === "erro" && (
                        <>
                            <h2 style={{ color: "#dc2626" }}>Não foi possível confirmar o pagamento</h2>
                            <p>{mensagem}</p>
                            <Link to="/carrinho" style={{ textDecoration: "underline" }}>
                                Voltar ao carrinho
                            </Link>
                        </>
                    )}
                </div>
            </main>

            <footer className="loja-footer">
                <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
            </footer>
        </div>
    );
}

export default PagamentoSucesso;
