import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { guardarSenhaDigitada } from "../services/sessaoSenha";
import "../css/Login.css";

function Login() {

    const navigate = useNavigate();
    const googleBotaoRef = useRef(null);

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);

    // Guarda os dados de login (usuario + tokens) e navega pro painel —
    // usado tanto pelo login normal quanto pelo login com Google, já que
    // os dois recebem exatamente o mesmo formato de resposta do backend
    // (ver backend/usuarios/views.py::_resposta_login).
    function entrarComSucesso(dados) {
        localStorage.setItem("usuario", JSON.stringify(dados.usuario));
        localStorage.setItem("accessToken", dados.tokens.access);
        localStorage.setItem("refreshToken", dados.tokens.refresh);
        navigate("/dashboard");
    }

    async function fazerLogin(e) {

        e.preventDefault();

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
                alert(response.data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Erro ao conectar com o servidor");
        }
    }

    async function reenviarConfirmacao() {
        if (!email) {
            alert("Digite seu email no campo acima primeiro.");
            return;
        }
        try {
            const response = await api.post("reenviar-confirmacao/", { email });
            alert(response.data.message);
        } catch (error) {
            console.log(error);
            alert("Erro ao conectar com o servidor");
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
                        alert(apiResponse.data.message);
                    }
                } catch (error) {
                    console.log(error);
                    alert("Erro ao conectar com o servidor");
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
            <div className="login-card">

                <div className="login-brand">
                    <div className="login-brand-icon">
                        <span>G</span>
                    </div>
                    <h1 className="login-title">GRB OFICE</h1>
                    <p className="login-subtitle">Faça login para acessar o painel</p>
                </div>

                <form className="login-form" onSubmit={fazerLogin}>
                    <div className="input-group">
                        <label htmlFor="email">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Digite seu email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            />
                            <button
                                type="button"
                                className="btn-mostrar-senha"
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                                tabIndex={-1}
                            >
                                {mostrarSenha ? "🙈" : "👁"}
                            </button>
                        </div>
                    </div>

                    <button className="login-btn" type="submit">
                        Entrar
                    </button>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                        <button
                            type="button"
                            onClick={reenviarConfirmacao}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", textDecoration: "underline", fontSize: "13px" }}
                        >
                            Não recebeu o email de confirmação? Reenviar
                        </button>

                        <Link to="/esqueci-senha" style={{ fontSize: "13px", textDecoration: "underline" }}>
                            Esqueci minha senha
                        </Link>
                    </div>

                    <div ref={googleBotaoRef} style={{ display: "flex", justifyContent: "center", margin: "8px 0" }} />

                    <Link to="/cadastro">
                        Cadastre-se
                    </Link>
                </form>

                <div className="login-footer">
                    <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
}

export default Login;
