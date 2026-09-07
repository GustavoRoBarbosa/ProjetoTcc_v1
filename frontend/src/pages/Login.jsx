import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { guardarSenhaDigitada } from "../services/sessaoSenha";
import "../css/Login.css";

function Login() {

    const navigate = useNavigate();
    const googleBotaoRef = useRef(null);
    // Ex: veio de "Comprar" num produto sem estar logado — depois de
    // entrar, volta pra lá em vez de cair no destino padrão. Ver
    // LojaProduto.jsx, que manda pra cá com ?next=/produto/<id>.
    const [searchParams] = useSearchParams();
    const proximaRota = searchParams.get("next");

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [entrando, setEntrando] = useState(false);
    const [erro, setErro] = useState("");
    const [aviso, setAviso] = useState("");

    // Guarda os dados de login (usuario + tokens) e navega pro painel —
    // usado tanto pelo login normal quanto pelo login com Google, já que
    // os dois recebem exatamente o mesmo formato de resposta do backend
    // (ver backend/usuarios/views.py::_resposta_login).
    function entrarComSucesso(dados) {
        localStorage.setItem("usuario", JSON.stringify(dados.usuario));
        localStorage.setItem("accessToken", dados.tokens.access);
        localStorage.setItem("refreshToken", dados.tokens.refresh);

        if (proximaRota) {
            navigate(proximaRota);
            return;
        }

        // Cliente cai na própria área (Minha Conta); admin/funcionário
        // continuam indo pro painel de gestão — ver PrivateRoute.jsx
        // pro porquê cliente nem consegue acessar /dashboard direto.
        navigate(dados.usuario.tipo === "cliente" ? "/minha-conta" : "/dashboard");
    }

    async function fazerLogin(e) {

        e.preventDefault();

        if (entrando) return;

        setErro("");
        setAviso("");
        setEntrando(true);

        try {

            const response = await api.post("login/", {
                email,
                senha
            });

            if (response.data.success) {
                // Só o login por senha guarda a senha digitada (pro
                // Dashboard poder exibir); login Google não tem senha
                // nossa — ver services/sessaoSenha.js.
                guardarSenhaDigitada(senha);
                entrarComSucesso(response.data);
            } else {
                setErro(response.data.message);
                setEntrando(false);
            }
        } catch (error) {
            console.log(error);
            setErro("Erro ao conectar com o servidor.");
            setEntrando(false);
        }
    }

    async function reenviarConfirmacao() {
        if (!email) {
            setErro("Digite seu email no campo acima primeiro.");
            return;
        }
        setErro("");
        setAviso("");
        try {
            const response = await api.post("reenviar-confirmacao/", { email });
            setAviso(response.data.message);
        } catch (error) {
            console.log(error);
            setErro("Erro ao conectar com o servidor.");
        }
    }

    // O botão "Entrar com Google" é renderizado pelo próprio script do
    // Google (carregado em public/index.html), não é HTML nosso — a
    // gente só inicializa com nosso Client ID e diz onde desenhar.
    // Sem REACT_APP_GOOGLE_CLIENT_ID configurado (frontend/.env), o
    // botão simplesmente não aparece, em vez de quebrar a tela.
    useEffect(() => {
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        if (!clientId || !window.google || !googleBotaoRef.current) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (resposta) => {
                try {
                    const apiResponse = await api.post("login-google/", {
                        credential: resposta.credential,
                    });
                    if (apiResponse.data.success) {
                        entrarComSucesso(apiResponse.data);
                    } else {
                        setErro(apiResponse.data.message);
                    }
                } catch (error) {
                    console.log(error);
                    setErro("Erro ao conectar com o servidor.");
                }
            },
        });

        window.google.accounts.id.renderButton(googleBotaoRef.current, {
            theme: "outline",
            size: "large",
            width: 320,
            text: "signin_with",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="login-page">
            <Link to="/" className="login-voltar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                </svg>
                Voltar à loja
            </Link>

            <div className="login-card">

                <div className="login-brand">
                    <div className="login-brand-icon">
                        <span>G</span>
                    </div>
                    <h1 className="login-title">GRB OFICE</h1>
                    <p className="login-subtitle">Faça login para acessar sua conta</p>
                </div>

                {erro && (
                    <div className="login-alerta login-alerta-erro" role="alert">
                        {erro}
                    </div>
                )}

                {aviso && (
                    <div className="login-alerta login-alerta-aviso" role="status">
                        {aviso}
                    </div>
                )}

                <form className="login-form" onSubmit={fazerLogin}>
                    <div className="input-group">
                        <label htmlFor="email">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Digite seu email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="senha">Senha</label>
                        <div className="senha-wrapper">
                            <input
                                id="senha"
                                type={mostrarSenha ? "text" : "password"}
                                placeholder="Digite sua senha"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="btn-mostrar-senha"
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                                tabIndex={-1}
                            >
                                {mostrarSenha ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <path d="M1 1l22 22" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <Link to="/esqueci-senha" className="login-link-inline login-esqueci-senha">
                            Esqueci minha senha
                        </Link>
                    </div>

                    <button className="login-btn" type="submit" disabled={entrando}>
                        {entrando ? "Entrando..." : "Entrar"}
                    </button>

                    <button
                        type="button"
                        onClick={reenviarConfirmacao}
                        className="login-link-inline login-reenviar"
                    >
                        Não recebeu o email de confirmação? Reenviar
                    </button>

                    {process.env.REACT_APP_GOOGLE_CLIENT_ID && (
                        <div className="login-divisor">
                            <span>ou continue com</span>
                        </div>
                    )}

                    <div ref={googleBotaoRef} className="login-google-botao" />
                </form>

                <p className="login-cadastro-link">
                    Ainda não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
                </p>

                <div className="login-footer">
                    <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
}

export default Login;
