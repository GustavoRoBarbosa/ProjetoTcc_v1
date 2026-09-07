import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

// Só admin acessa esta tela — o backend também recusa o PATCH pra quem
// não é admin (EhAdministrador), esta checagem aqui é só pra não mostrar
// uma tela cujas ações vão dar 403.
function ehAdmin(usuario) {
    return !!usuario && usuario.tipo === "adm";
}

// Liga/desliga funcionalidades do sistema sem precisar mexer em código
// (hoje só a Reserva, RF06) — ver backend/pedidos/models.py::ConfiguracaoSistema.
function Configuracoes() {

    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));
    const showToast = useToast();
    const [config, setConfig] = useState(null);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        try {
            const response = await api.get("configuracoes/");
            setConfig(response.data);
        } catch (error) {
            console.log(error);
            showToast("Erro ao carregar configurações", "error");
        }
    }

    useEffect(() => {
        if (ehAdmin(usuarioLogado)) carregar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function alternarReserva() {
        const novoValor = !config.reserva_habilitada;
        setSalvando(true);
        try {
            const response = await api.patch("configuracoes/", { reserva_habilitada: novoValor });
            if (response.data.success) {
                setConfig(response.data);
                showToast(`Reserva ${novoValor ? "ativada" : "desativada"} com sucesso.`, "success");
            } else {
                showToast(response.data.message, "error");
            }
        } catch (error) {
            console.log(error);
            showToast("Erro ao alterar configuração", "error");
        } finally {
            setSalvando(false);
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
                        <h1>Configurações</h1>
                        <p>Ligue ou desligue funcionalidades do sistema</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="dashboard-info-card">
                        {!config ? (
                            <p>Carregando...</p>
                        ) : (
                            <div className="config-item">
                                <div className="config-item-texto">
                                    <h3>Reserva de peças</h3>
                                    <p>
                                        Permite que clientes reservem itens do carrinho sem pagar na hora
                                        (RF06). Desativar esconde o botão "Reservar" no carrinho e bloqueia
                                        novas reservas — reservas já feitas continuam valendo até serem
                                        canceladas em "Reservas".
                                    </p>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={config.reserva_habilitada}
                                        onChange={alternarReserva}
                                        disabled={salvando}
                                    />
                                    <span className="toggle-switch-track"></span>
                                </label>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Configuracoes;
