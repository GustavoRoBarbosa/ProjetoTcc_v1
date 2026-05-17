import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

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
        <div>

            <h1>Login</h1>

            <form onSubmit={fazerLogin}>
                <input
                    type="email"
                    placeholder="Digite seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <br />
                <br />

                <input
                    type="password"
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                />

                <br />
                <br />

                <button type="submit">Entrar</button>
            </form>

        </div>
    )
}

export default Login;