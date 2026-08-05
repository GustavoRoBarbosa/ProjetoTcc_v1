import { Navigate } from "react-router-dom";

// apenasEquipe: usado nas rotas de gestão (Dashboard, Peças, Categorias,
// Fornecedores, Usuários, Logs) — cliente autenticado não deve ver essas
// telas (ele tem sua própria área, ver ContaCliente.jsx), então é
// mandado pra lá em vez de ver "acesso negado" ou a tela errada. A
// garantia real de segurança continua sendo o backend (cada endpoint
// checa permissão por conta própria); isso aqui é só a experiência de
// navegação, pra não mostrar telas que não fazem sentido pro cliente.
function PrivateRoute({ children, apenasEquipe = false }) {

    // Checagem só de presença (não decodifica/valida o token aqui) — é uma
    // guarda de UX para não mostrar a tela a quem nunca logou. A validação
    // de verdade acontece no backend a cada requisição; se o access token
    // estiver expirado, o interceptor em services/api.js tenta renová-lo
    // sozinho com o refreshToken antes de desistir.
    const usuarioRaw = localStorage.getItem("usuario");
    const accessToken = localStorage.getItem("accessToken");

    if (!usuarioRaw || !accessToken) {
        // "/" agora é a vitrine pública (Loja.jsx), não mais o login —
        // quem tenta acessar uma rota protegida sem sessão vai direto
        // pro formulário de login.
        return <Navigate to="/login" />;
    }

    if (apenasEquipe) {
        const usuario = JSON.parse(usuarioRaw);
        if (usuario.tipo === "cliente") {
            return <Navigate to="/minha-conta" />;
        }
    }

    return children;
}

export default PrivateRoute;
