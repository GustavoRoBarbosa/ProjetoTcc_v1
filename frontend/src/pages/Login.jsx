import { useState } from "react";
import api from "../services/api";

function Login() {

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    async function fazerLogin(e) {
        
        e.preventDefault();

        try{

            const response = await api.post("login/", {
                email,
                senha
            });

            if (response.data.sucess){
                alert("Login Realizado Com Sucesso");
                console.log(response.data);
            } else{
                alert(response.data.message);
            }
        } catch (error){
            console.log(error);
            alert("Erro ao conectar com o servidor");
        }
    }

    return (
        <div>

            <h1>Login</h1>

            <form onSubmit={fazerLogin}>
                <input
                    type = "email"
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