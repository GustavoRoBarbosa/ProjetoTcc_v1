import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "../css/Login.css";

// Primeiro passo do "esqueci minha senha": só pede o email e dispara o
// link de redefinição (ver backend/usuarios/views.py::esqueci_senha).
// A resposta do backend é sempre a mesma genérica, exista ou não conta
// com esse email — não dá pra saber pelo retorno se o email é válido.
function EsqueciSenha() {

    const [email, setEmail] = useState("");
    const [enviando, setEnviando] = useState(false);

    async function enviarPedido(e) {
        e.preventDefault();

        setEnviando(true);
        try {
            const response = await api.post("esqueci-senha/", { email });
            alert(response.data.message);
        } catch (error) {
            console.log(error);
            alert("Erro ao conectar com o servidor");
        } finally {
            setEnviando(false);
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
                    <p className="login-subtitle">Esqueci minha senha</p>
                </div>

                <form className="login-form" onSubmit={enviarPedido}>
                    <div className="input-group">
                        <label htmlFor="email">E-mail da sua conta</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Digite seu email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button className="login-btn" type="submit" disabled={enviando}>
                        {enviando ? "Enviando..." : "Enviar link de redefinição"}
                    </button>

                    <Link to="/">Voltar ao login</Link>
                </form>

                <div className="login-footer">
                    <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
}

export default EsqueciSenha;
