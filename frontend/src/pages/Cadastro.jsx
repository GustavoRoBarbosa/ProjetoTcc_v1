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

    async function cadastrarUsuario(e) {

        e.preventDefault();

        try {

            const response = await api.post("cadastro/", {
                nome,
                email,
                senha,
                telefone
            });

            if (response.data.success) {
                alert("Cadastro realizado com sucesso");
                navigate("/");
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
                        />
                    </div>

                    <div className="cadastro-form-row">
                        <div className="input-group">
                            <label htmlFor="senha">Senha</label>
                            <input
                                id="senha"
                                type="password"
                                placeholder="Crie uma senha"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="telefone">Telefone</label>
                            <input
                                id="telefone"
                                type="text"
                                placeholder="(00) 00000-0000"
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                            />
                        </div>
                    </div>

                    <button className="cadastro-btn" type="submit">
                        Cadastrar
                    </button>

                    <p className="cadastro-login-link">
                        Já tem uma conta? <Link to="/">Fazer login</Link>
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