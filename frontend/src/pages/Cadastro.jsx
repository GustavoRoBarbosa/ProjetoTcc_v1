import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

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

        <div>

            <h1>Cadastro</h1>

            <form onSubmit={cadastrarUsuario}>

                <input
                    type="text"
                    placeholder="Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                />

                <br />
                <br />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <br />
                <br />

                <input
                    type="password"
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                />

                <br />
                <br />

                <input
                    type="text"
                    placeholder="Telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                />

                <br />
                <br />

                <button type="submit">
                    Cadastrar
                </button>
                

            </form>

        </div>
    );
}

export default Cadastro;