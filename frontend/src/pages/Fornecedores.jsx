import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useToast } from "../components/ToastContext";
import { useConfirm } from "../components/ConfirmContext";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

function podeGerenciar(usuario) {
    if (!usuario) return false;
    return usuario.tipo === "adm" || (usuario.tipo === "funcionario" && usuario.pode_gerenciar_pecas);
}

const FORM_VAZIO = { nome: "", contato: "", telefone: "", email: "" };

// Aplica a máscara brasileira (XX) XXXXX-XXXX / (XX) XXXX-XXXX conforme o
// usuário digita. Números 0800 (linha gratuita) não têm DDD nem seguem
// esse padrão, então ficam só com os dígitos, sem parênteses/traço.
function formatarTelefone(valor) {
    const digitos = valor.replace(/\D/g, "").slice(0, 11);

    // Sem isso, apagar o campo até ficar vazio (ou digitar só 1 dígito e
    // depois apagar) deixava um "(" sobrando — regex casando com string
    // vazia ainda produz "($1" mesmo sem nenhum dígito.
    if (!digitos) {
        return "";
    }
    if (digitos.startsWith("0800")) {
        return digitos;
    }
    if (digitos.length <= 2) {
        return digitos.replace(/^(\d*)/, "($1");
    }
    if (digitos.length <= 6) {
        return digitos.replace(/^(\d{2})(\d*)/, "($1) $2");
    }
    if (digitos.length <= 10) {
        return digitos.replace(/^(\d{2})(\d{4})(\d*)/, "($1) $2-$3");
    }
    return digitos.replace(/^(\d{2})(\d{5})(\d*)/, "($1) $2-$3");
}

function Fornecedores() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const showToast = useToast();
    const confirm = useConfirm();
    const [fornecedores, setFornecedores] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);

    async function carregar() {
        setCarregando(true);
        try {
            const response = await api.get("fornecedores/");
            setFornecedores(response.data);
        } catch (error) {
            console.log(error);
            showToast("Erro ao carregar fornecedores", "error");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    function abrirFormNovo() {
        setForm(FORM_VAZIO);
        setEditandoId(null);
        setMostrarForm(true);
    }

    function abrirFormEdicao(fornecedor) {
        setForm({
            nome: fornecedor.nome,
            contato: fornecedor.contato,
            telefone: fornecedor.telefone,
            email: fornecedor.email,
        });
        setEditandoId(fornecedor.id);
        setMostrarForm(true);
    }

    function fecharForm() {
        setMostrarForm(false);
        setEditandoId(null);
    }

    async function salvarFornecedor(e) {
        e.preventDefault();

        // "contato" é só o nome de uma pessoa — sozinho não dá nenhum
        // jeito real de falar com o fornecedor. Por isso a exigência é
        // telefone OU e-mail (o backend também valida isso; aqui é só
        // pra dar feedback imediato sem round-trip).
        const digitosTelefone = form.telefone.replace(/\D/g, "");

        if (!digitosTelefone && !form.email.trim()) {
            showToast("Informe ao menos um telefone ou e-mail para contato.", "error");
            return;
        }

        // A máscara aplicada no campo (formatarTelefone) já produz "("
        // com um único dígito digitado — sem essa checagem isso passaria
        // como "telefone preenchido" mesmo não sendo um telefone de verdade.
        if (digitosTelefone && digitosTelefone.length < 10) {
            showToast("Telefone incompleto — informe ao menos 10 dígitos (com DDD).", "error");
            return;
        }

        // Manda o telefone realmente vazio quando não há dígito nenhum,
        // em vez de confiar cegamente no que sobrou no campo de texto.
        const dadosParaEnviar = { ...form, telefone: digitosTelefone ? form.telefone : "" };

        try {
            if (editandoId) {
                await api.patch(`fornecedores/${editandoId}/`, dadosParaEnviar);
            } else {
                await api.post("fornecedores/", dadosParaEnviar);
            }
            fecharForm();
            carregar();
        } catch (error) {
            console.log(error);
            showToast("Erro ao salvar fornecedor", "error");
        }
    }

    async function excluirFornecedor(id) {
        if (!await confirm("Excluir este fornecedor? Só é possível se não houver peças vinculadas a ele.")) return;
        try {
            await api.delete(`fornecedores/${id}/`);
            carregar();
        } catch (error) {
            console.log(error);
            showToast("Erro ao excluir fornecedor (pode haver peças vinculadas a ele)", "error");
        }
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-content">
                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Fornecedores</h1>
                        <p>Empresas de quem as peças são compradas</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="catalogo-toolbar">
                        <h2>{fornecedores.length} fornecedor(es) cadastrado(s)</h2>
                        {podeGerenciar(usuario) && !mostrarForm && (
                            <button className="btn-primary" onClick={abrirFormNovo}>
                                + Novo fornecedor
                            </button>
                        )}
                    </div>

                    {podeGerenciar(usuario) && mostrarForm && (
                        <form className="catalogo-form" onSubmit={salvarFornecedor}>
                            <div className="input-group">
                                <label htmlFor="nome">Nome</label>
                                <input
                                    id="nome"
                                    value={form.nome}
                                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="contato">Contato</label>
                                <input
                                    id="contato"
                                    value={form.contato}
                                    onChange={(e) => setForm({ ...form, contato: e.target.value })}
                                    placeholder="Nome da pessoa, opcional"
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="telefone">Telefone</label>
                                <input
                                    id="telefone"
                                    value={form.telefone}
                                    onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                                    placeholder="(00) 00000-0000 ou 0800..."
                                    maxLength={15}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="email">E-mail</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="Ou preencha o telefone"
                                />
                            </div>
                            <div className="form-actions">
                                <button className="btn-primary" type="submit">
                                    {editandoId ? "Salvar alterações" : "Adicionar fornecedor"}
                                </button>
                                <button className="btn-secondary" type="button" onClick={fecharForm}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="catalogo-table-wrapper">
                        {carregando ? (
                            <div className="catalogo-empty">Carregando...</div>
                        ) : fornecedores.length === 0 ? (
                            <div className="catalogo-empty">Nenhum fornecedor cadastrado ainda.</div>
                        ) : (
                            <table className="catalogo-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Contato</th>
                                        <th>Telefone</th>
                                        <th>E-mail</th>
                                        {podeGerenciar(usuario) && <th>Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fornecedores.map((fornecedor) => (
                                        <tr key={fornecedor.id}>
                                            <td>{fornecedor.nome}</td>
                                            <td>{fornecedor.contato || "—"}</td>
                                            <td>{fornecedor.telefone || "—"}</td>
                                            <td>{fornecedor.email || "—"}</td>
                                            {podeGerenciar(usuario) && (
                                                <td>
                                                    <div className="catalogo-acoes">
                                                        <button className="btn-secondary" onClick={() => abrirFormEdicao(fornecedor)}>
                                                            Editar
                                                        </button>
                                                        <button className="btn-danger" onClick={() => excluirFornecedor(fornecedor.id)}>
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
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

export default Fornecedores;
