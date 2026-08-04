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

    async function redefinir(e) {
        e.preventDefault();

        if (!token) {
            alert("Link inválido: token não encontrado na URL.");
            return;
        }

        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!regexSenha.test(novaSenha)) {
            alert(
                "A senha deve possuir:\n\n" +
                "- 8 caracteres\n" +
                "- letra maiúscula\n" +
                "- letra minúscula\n" +
                "- número\n" +
                "- caractere especial"
            );
            return;
        }

        if (novaSenha !== confirmarSenha) {
            alert("As senhas não coincidem.");
            return;
        }

        setEnviando(true);
        try {
            const response = await api.post("redefinir-senha/", {
                token,
                nova_senha: novaSenha,
            });

            alert(response.data.message);

            if (response.data.success) {
                navigate("/");
            }
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
                    <p className="login-subtitle">Escolha uma nova senha</p>
                </div>

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
                                {mostrarSenha ? "🙈" : "👁"}
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

                    <Link to="/">Voltar ao login</Link>
                </form>

                <div className="login-footer">
                    <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
}

export default RedefinirSenha;
