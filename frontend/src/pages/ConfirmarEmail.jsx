import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "../css/Login.css";

// Página que o link do email de confirmação abre:
// {FRONTEND_URL}/confirmar-email?token=... (ver backend/usuarios/emails.py).
// Ela só lê o token da URL e repassa pro backend confirmar — quem decide
// se o token é válido/expirado é sempre o backend.
function ConfirmarEmail() {

    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState("carregando"); // carregando | sucesso | erro
    const [mensagem, setMensagem] = useState("");

    useEffect(() => {
        async function confirmar() {
            if (!token) {
                setStatus("erro");
                setMensagem("Link de confirmação inválido: token não encontrado na URL.");
                return;
            }

            try {
                const response = await api.post("confirmar-email/", { token });
                setStatus(response.data.success ? "sucesso" : "erro");
                setMensagem(response.data.message);
            } catch (error) {
                console.log(error);
                setStatus("erro");
                setMensagem("Erro ao conectar com o servidor");
            }
        }

        confirmar();
    }, [token]);

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <div className="login-brand-icon">
                        <span>G</span>
                    </div>
                    <h1 className="login-title">GRB OFICE</h1>
                    <p className="login-subtitle">Confirmação de cadastro</p>
                </div>

                <div style={{ textAlign: "center", padding: "12px 0" }}>
                    {status === "carregando" && <p>Confirmando seu email...</p>}
                    {status !== "carregando" && <p>{mensagem}</p>}
                </div>

                {status === "sucesso" && (
                    <Link to="/login" className="login-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                        Ir para o login
                    </Link>
                )}

                {status === "erro" && (
                    <p style={{ textAlign: "center" }}>
                        <Link to="/cadastro">Voltar ao cadastro</Link>
                    </p>
                )}
            </div>
        </div>
    );
}

export default ConfirmarEmail;
