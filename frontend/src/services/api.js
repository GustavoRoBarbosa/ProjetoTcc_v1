import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api/"
});

// Endpoints públicos (não exigem — e não devem receber — token). Mandar
// um access token velho/expirado para o login, por exemplo, faria o
// backend rejeitar a autenticação ANTES de sequer checar que o endpoint
// é público (a checagem de autenticação do DRF roda antes da permissão),
// derrubando o login com 403 mesmo sendo uma rota aberta.
const ENDPOINTS_PUBLICOS = [
    "login/", "login-google/", "cadastro/", "token/refresh/",
    "confirmar-email/", "reenviar-confirmacao/",
    "esqueci-senha/", "redefinir-senha/",
];

// Antes de cada request, anexa o access token salvo no login (se existir)
// no header Authorization. É assim que o backend sabe quem está chamando
// e aplica as permissões (ver backend/usuarios/auth.py e permissions.py).
api.interceptors.request.use((config) => {
    const ehPublico = ENDPOINTS_PUBLICOS.some((endpoint) => config.url?.startsWith(endpoint));
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken && !ehPublico) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

// O access token dura só 30 minutos (ver backend/usuarios/auth.py). Quando
// ele expira, o backend responde 401. Em vez de derrubar o usuário na hora,
// tentamos trocar o refresh token (válido por 7 dias) por um access token
// novo e repetir a chamada original uma única vez — só se isso falhar
// também é que consideramos a sessão realmente encerrada.
let refrescandoToken = null;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const requisicaoOriginal = error.config;

        const eh401 = error.response?.status === 401;
        const jaTentouRefresh = requisicaoOriginal?._jaTentouRefresh;

        if (!eh401 || jaTentouRefresh) {
            return Promise.reject(error);
        }

        requisicaoOriginal._jaTentouRefresh = true;

        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
            limparSessao();
            return Promise.reject(error);
        }

        try {
            // Evita disparar vários refresh em paralelo se várias
            // chamadas derem 401 ao mesmo tempo: todas esperam a mesma
            // promise de refresh em andamento.
            if (!refrescandoToken) {
                refrescandoToken = api
                    .post("token/refresh/", { refresh: refreshToken })
                    .finally(() => { refrescandoToken = null; });
            }

            const resposta = await refrescandoToken;

            if (!resposta.data.success) {
                limparSessao();
                return Promise.reject(error);
            }

            const { access, refresh } = resposta.data.tokens;
            localStorage.setItem("accessToken", access);
            localStorage.setItem("refreshToken", refresh);

            requisicaoOriginal.headers.Authorization = `Bearer ${access}`;
            return api(requisicaoOriginal);
        } catch (erroRefresh) {
            limparSessao();
            return Promise.reject(erroRefresh);
        }
    }
);

function limparSessao() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
}

export default api;
