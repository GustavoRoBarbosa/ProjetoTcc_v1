import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";

function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    async function fazerLogin(e) {

        e.preventDefault();

        try {

            const response = await api.post("login/", {
                email,
                senha
            });

            if (response.data.sucess) {
                localStorage.setItem(
                    "usuario",
                    JSON.stringify(response.data.usuario)
                );

                navigate("/dashboard");
            } else {
                alert(response.data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Erro ao conectar com o servidor");
        }
    }

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
                        <input
                            id="senha"
                            type="password"
                            placeholder="Digite sua senha"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                        />
                    </div>

                    <button className="login-btn" type="submit">
                        Entrar
                    </button>
                </form>

                <div className="login-footer">
                    <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
}

export default Login;
