// Guarda a senha digitada no login SÓ na memória do módulo JS (uma
// variável comum, não localStorage/sessionStorage) — sobrevive à
// navegação entre páginas dentro da mesma aba (SPA não recarrega o
// módulo ao trocar de rota), mas some ao dar F5 ou fechar a aba.
//
// É uma troca deliberada: guardar a senha em disco (localStorage) seria
// mais "conveniente" (sobrevive a F5), mas deixaria a senha em texto
// puro exposta a qualquer XSS ou acesso físico ao navegador depois que a
// sessão já acabou. Em memória, o risco fica limitado à sessão atual.
//
// Login com Google nunca chama guardarSenhaDigitada() — contas Google
// não têm senha nossa (ver backend/usuarios/auth_google.py), então
// obterSenhaDigitada() simplesmente retorna null pra essas contas.

let senhaDigitada = null;

export function guardarSenhaDigitada(senha) {
    senhaDigitada = senha;
}

export function obterSenhaDigitada() {
    return senhaDigitada;
}

export function limparSenhaDigitada() {
    senhaDigitada = null;
}
