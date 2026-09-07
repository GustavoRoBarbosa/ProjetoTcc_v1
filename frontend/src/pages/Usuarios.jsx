import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import { useConfirm } from "../components/ConfirmContext";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

// Só admin acessa esta tela — o backend também recusa a chamada de
// PATCH pra quem não é admin (EhAdministrador), esta checagem aqui é
// só pra não mostrar uma tela cujas ações vão dar 403.
function ehAdmin(usuario) {
    return !!usuario && usuario.tipo === "adm";
}

function Usuarios() {

    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));
    const showToast = useToast();
    const confirm = useConfirm();
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);

    async function carregar() {
        setCarregando(true);
        try {
            const response = await api.get("usuarios/");
            setUsuarios(response.data);
        } catch (error) {
            console.log(error);
            showToast("Erro ao carregar usuários", "error");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function alternarPermissao(usuarioAlvo) {
        const novoValor = !usuarioAlvo.pode_gerenciar_pecas;
        const acaoTexto = novoValor ? "conceder" : "revogar";

        if (!await confirm(`Confirma ${acaoTexto} acesso ao catálogo para ${usuarioAlvo.nome}?`)) return;

        try {
            await api.patch(`usuarios/${usuarioAlvo.id}/permissao-pecas/`, {
                pode_gerenciar_pecas: novoValor,
            });
            carregar();
        } catch (error) {
            console.log(error);
            showToast("Erro ao alterar permissão", "error");
        }
    }

    if (!ehAdmin(usuarioLogado)) {
        return (
            <div className="dashboard-layout">
                <Sidebar />
                <div className="dashboard-content">
                    <main className="dashboard-main">
                        <div className="catalogo-empty">Só administradores acessam esta tela.</div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-content">
                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Usuários</h1>
                        <p>Contas cadastradas no sistema</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="catalogo-toolbar">
                        <h2>{usuarios.length} usuário(s) cadastrado(s)</h2>
                    </div>

                    <div className="catalogo-table-wrapper">
                        {carregando ? (
                            <div className="catalogo-empty">Carregando...</div>
                        ) : (
                            <table className="catalogo-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>E-mail</th>
                                        <th>Tipo</th>
                                        <th>Ativo</th>
                                        <th>Acesso ao catálogo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>{usuario.nome}</td>
                                            <td>{usuario.email}</td>
                                            <td>
                                                <span className={`badge ${usuario.tipo === "adm" ? "badge-admin" : "badge-user"}`}>
                                                    {usuario.tipo}
                                                </span>
                                            </td>
                                            <td>{usuario.ativo ? "Sim" : "Não"}</td>
                                            <td>
                                                {usuario.tipo === "funcionario" ? (
                                                    <button
                                                        className={usuario.pode_gerenciar_pecas ? "btn-danger" : "btn-primary"}
                                                        onClick={() => alternarPermissao(usuario)}
                                                    >
                                                        {usuario.pode_gerenciar_pecas ? "Revogar" : "Conceder"}
                                                    </button>
                                                ) : (
                                                    <span title="Só se aplica a funcionários">
                                                        {usuario.tipo === "adm" ? "Sempre (admin)" : "—"}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Usuarios;
