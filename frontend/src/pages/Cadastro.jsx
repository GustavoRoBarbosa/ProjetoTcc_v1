import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "../css/Cadastro.css";

function Cadastro() {

    const navigate = useNavigate();

    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [telefone, setTelefone] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [enviando, setEnviando] = useState(false);

    const regexNome = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]*$/;

    async function cadastrarUsuario(e) {

        e.preventDefault();

        if (enviando) return;

        setErro("");
        setSucesso("");

        if (!nome.trim()) {
            setErro("O nome é obrigatório.");
            return;
        }

        if (!regexNome.test(nome)) {
            setErro("O nome deve conter apenas letras.");
            return;
        }

        if (!email.trim()) {
            setErro("O email é obrigatório.");
            return;
        }

        if (!telefone.trim()) {
            setErro("O telefone é obrigatório.");
            return;
        }


        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

        if (!regexSenha.test(senha)) {
            setErro(
                "A senha deve ter no mínimo 8 caracteres, incluindo letra " +
                "maiúscula, letra minúscula, número e caractere especial."
            );
            return;
        }

        if (senha !== confirmarSenha) {
            setErro("As senhas não coincidem.");
            return;
        }

        setEnviando(true);

        try {

            const response = await api.post("cadastro/", {
                nome,
                email,
                senha,
                telefone
            });

            if (response.data.success) {
                // A conta já existe, mas fica bloqueada pra login até o
                // link do email ser clicado (ver backend/usuarios/views.py::cadastrar) —
                // response.data.message já vem com essa instrução do backend.
                setSucesso(response.data.message);
                setTimeout(() => navigate("/login"), 2000);
            } else {
                setErro(response.data.message);
                setEnviando(false);
            }

        } catch (error) {
            console.log(error);
            setErro("Erro ao cadastrar. Tente novamente em instantes.");
            setEnviando(false);
        }
    }

    return (
        <div className="cadastro-page">
            <div className="cadastro-card">

                <div className="cadastro-brand">
                    <div className="cadastro-brand-icon">
                        <span>G</span>
                    </div>
                    <h1 className="cadastro-title">Criar Conta</h1>
                    <p className="cadastro-subtitle">Preencha os dados para se cadastrar</p>
                </div>

                <form className="cadastro-form" onSubmit={cadastrarUsuario}>

                    {erro && (
                        <div className="cadastro-alerta cadastro-alerta-erro" role="alert">
                            {erro}
                        </div>
                    )}

                    {sucesso && (
                        <div className="cadastro-alerta cadastro-alerta-sucesso" role="status">
                            {sucesso}
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="nome">Nome completo</label>
                        <input
                            id="nome"
                            type="text"
                            placeholder="Digite seu nome"
                            value={nome}
                            onChange={(e) => {
                                if (regexNome.test(e.target.value)) {
                                    setNome(e.target.value);
                                }
                            }}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Digite seu email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="cadastro-form-row">
                        <div className="input-group">
                            <label htmlFor="senha">Senha</label>
                            <div className="senha-wrapper">
                                <input
                                    id="senha"
                                    type={mostrarSenha ? "text" : "password"}
                                    placeholder="Crie uma senha"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
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
                            <label htmlFor="confirmarSenha">Confirme sua senha</label>
                            <div className="senha-wrapper">
                                <input
                                    id="confirmarSenha"
                                    type={mostrarConfirmarSenha ? "text" : "password"}
                                    placeholder="Repita a senha"
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-mostrar-senha"
                                    onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                                    aria-label={mostrarConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                                    tabIndex={-1}
                                >
                                    {mostrarConfirmarSenha ? "🙈" : "👁"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="telefone">Telefone</label>
                        <input
                            id="telefone"
                            type="text"
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            value={telefone}
                            onChange={(e) => {let valor = e.target.value;

                                valor = valor.replace(/\D/g, '');

                                valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');

                                valor = valor.replace(/(\d{5})(\d)/, '$1-$2');

                                setTelefone(valor);
                            }}
                            required
                        />
                    </div>

                    <button className="cadastro-btn" type="submit" disabled={enviando}>
                        {enviando ? "Cadastrando..." : "Cadastrar"}
                    </button>

                    <p className="cadastro-login-link">
                        Já tem uma conta? <Link to="/login">Fazer login</Link>
                    </p>

                </form>

                <div className="cadastro-footer">
                    <p>© 2026 GRB Ofice — Todos os direitos reservados</p>
                </div>

            </div>
        </div>
    );
}

export default Cadastro;