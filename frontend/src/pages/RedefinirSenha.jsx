import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "../css/Login.css";

// Segundo passo do "esqueci minha senha": abre a partir do link do
// email (?token=...) e deixa escolher a nova senha. Mesma regra de
// força de senha do cadastro (validada de verdade no backend; aqui é
// só feedback rápido antes do round-trip).
function RedefinirSenha() {

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");

    async function redefinir(e) {
        e.preventDefault();

        setErro("");
        setSucesso("");

        if (!token) {
            setErro("Link inválido: token não encontrado na URL.");
            return;
        }

        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!regexSenha.test(novaSenha)) {
            setErro(
                "A senha deve ter no mínimo 8 caracteres, incluindo letra " +
                "maiúscula, letra minúscula, número e caractere especial."
            );
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setErro("As senhas não coincidem.");
            return;
        }

        setEnviando(true);
        try {
            const response = await api.post("redefinir-senha/", {
                token,
                nova_senha: novaSenha,
            });

            if (response.data.success) {
                setSucesso(response.data.message);
                setTimeout(() => navigate("/login"), 2000);
            } else {
                setErro(response.data.message);
                setEnviando(false);
            }
        } catch (error) {
            console.log(error);
            setErro("Erro ao conectar com o servidor.");
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
                    <p className="login-subtitle">Escolha uma nova senha</p>
                </div>

                {erro && (
                    <div className="login-alerta login-alerta-erro" role="alert">
                        {erro}
                    </div>
                )}

                {sucesso && (
                    <div className="login-alerta login-alerta-aviso" role="status">
                        {sucesso}
                    </div>
                )}

                <form className="login-form" onSubmit={redefinir}>
                    <div className="input-group">
                        <label htmlFor="novaSenha">Nova senha</label>
                        <div className="senha-wrapper">
                            <input
                                id="novaSenha"
                                type={mostrarSenha ? "text" : "password"}
                                placeholder="Crie uma nova senha"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                required
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
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmarSenha">Confirme a nova senha</label>
                        <div className="senha-wrapper">
                            <input
                                id="confirmarSenha"
                                type={mostrarSenha ? "text" : "password"}
                                placeholder="Digite a senha novamente"
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button className="login-btn" type="submit" disabled={enviando}>
                        {enviando ? "Salvando..." : "Redefinir senha"}
                    </button>
                </form>

                <p className="login-cadastro-link">
                    <Link to="/login">← Voltar ao login</Link>
                </p>

                <div className="login-footer">
                    <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
}

export default RedefinirSenha;
