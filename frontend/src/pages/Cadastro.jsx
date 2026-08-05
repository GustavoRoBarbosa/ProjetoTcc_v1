import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "../css/Cadastro.css";

function Cadastro() {

    const navigate = useNavigate();

    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [telefone, setTelefone] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);

    async function cadastrarUsuario(e) {

        e.preventDefault();

        if (!nome.trim()) {

            alert("O nome é obrigatório");

            return;
        }

        if (!email.trim()) {

            alert("O email é obrigatório");

            return;
        }

        if (!telefone.trim()) {

            alert("O telefone é obrigatório");

            return;
        }


        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

        if (!regexSenha.test(senha)) {
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
                alert(response.data.message);
                navigate("/login");
            } else {
                alert(response.data.message);
            }

        } catch (error) {
            console.log(error);
            alert("Erro ao cadastrar");
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

                    <div className="input-group">
                        <label htmlFor="nome">Nome completo</label>
                        <input
                            id="nome"
                            type="text"
                            placeholder="Digite seu nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
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
                    </div>

                    <button className="cadastro-btn" type="submit">
                        Cadastrar
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