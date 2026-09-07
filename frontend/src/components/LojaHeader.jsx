import { Link, useNavigate } from "react-router-dom";
import { limparSenhaDigitada } from "../services/sessaoSenha";

// Cabeçalho compartilhado por Loja.jsx e LojaProduto.jsx. Antes cada uma
// tinha seu próprio cabeçalho fixo mostrando sempre "Entrar"/"Criar
// conta" — o que fazia um usuário JÁ logado, ao voltar pra vitrine,
// achar que tinha sido deslogado (a sessão continuava válida, só a tela
// não mostrava isso). Agora checa localStorage e mostra a opção certa.
function LojaHeader() {

    const navigate = useNavigate();
    const usuarioRaw = localStorage.getItem("usuario");
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

    function sair() {
        localStorage.removeItem("usuario");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        limparSenhaDigitada();
        navigate("/");
    }

    return (
        <header className="loja-header">
            <Link to="/" className="loja-brand">
                <div className="loja-brand-icon">G</div>
                <span>GRB OFICE</span>
            </Link>

            <div className="loja-header-acoes">
                {usuario ? (
                    <>
                        <Link to="/carrinho" className="loja-btn-outline loja-btn-carrinho" aria-label="Carrinho">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            Carrinho
                        </Link>
                        <Link
                            to={usuario.tipo === "cliente" ? "/minha-conta" : "/dashboard"}
                            className="loja-btn-outline"
                        >
                            Olá, {usuario.nome.split(" ")[0]}
                        </Link>
                        <button type="button" className="loja-btn-primary" onClick={sair}>
                            Sair
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="loja-btn-outline">Entrar</Link>
                        <Link to="/cadastro" className="loja-btn-primary">Criar conta</Link>
                    </>
                )}
            </div>
        </header>
    );
}

export default LojaHeader;
