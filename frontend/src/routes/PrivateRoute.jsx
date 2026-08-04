import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {

    // Checagem só de presença (não decodifica/valida o token aqui) — é uma
    // guarda de UX para não mostrar a tela a quem nunca logou. A validação
    // de verdade acontece no backend a cada requisição; se o access token
    // estiver expirado, o interceptor em services/api.js tenta renová-lo
    // sozinho com o refreshToken antes de desistir.
    const usuario = localStorage.getItem("usuario");
    const accessToken = localStorage.getItem("accessToken");

    if (!usuario || !accessToken) {
        return <Navigate to="/" />;
    }

    return children;
}

export default PrivateRoute;