import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import "../css/Dashboard.css";
import "../css/Catalogo.css";

// Só admin (sempre) ou funcionário autorizado (pode_gerenciar_pecas) veem
// os botões de criar/editar/excluir — o backend também bloqueia isso
// (permissions.py), esta checagem aqui é só para não mostrar uma ação que
// vai dar 403.
function podeGerenciar(usuario) {
    if (!usuario) return false;
    return usuario.tipo === "adm" || (usuario.tipo === "funcionario" && usuario.pode_gerenciar_pecas);
}

const FORM_VAZIO = { nome: "", descricao: "" };

function Categorias() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const [categorias, setCategorias] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);

    async function carregar() {
        setCarregando(true);
        try {
            const response = await api.get("categorias/");
            setCategorias(response.data);
        } catch (error) {
            console.log(error);
            alert("Erro ao carregar categorias");
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

    function abrirFormEdicao(categoria) {
        setForm({ nome: categoria.nome, descricao: categoria.descricao });
        setEditandoId(categoria.id);
        setMostrarForm(true);
    }

    function fecharForm() {
        setMostrarForm(false);
        setEditandoId(null);
    }

    async function salvarCategoria(e) {
        e.preventDefault();
        try {
            if (editandoId) {
                await api.patch(`categorias/${editandoId}/`, form);
            } else {
                await api.post("categorias/", form);
            }
            fecharForm();
            carregar();
        } catch (error) {
            console.log(error);
            alert("Erro ao salvar categoria (verifique se o nome já existe e se a descrição foi preenchida)");
        }
    }

    async function excluirCategoria(id) {
        if (!window.confirm("Excluir esta categoria? Só é possível se não houver peças vinculadas a ela.")) return;
        try {
            await api.delete(`categorias/${id}/`);
            carregar();
        } catch (error) {
            console.log(error);
            alert("Erro ao excluir categoria (pode haver peças vinculadas a ela)");
        }
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-content">
                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Categorias</h1>
                        <p>Agrupamento das peças do catálogo</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="catalogo-toolbar">
                        <h2>{categorias.length} categoria(s) cadastrada(s)</h2>
                        {podeGerenciar(usuario) && !mostrarForm && (
                            <button className="btn-primary" onClick={abrirFormNovo}>
                                + Nova categoria
                            </button>
                        )}
                    </div>

                    {podeGerenciar(usuario) && mostrarForm && (
                        <form className="catalogo-form" onSubmit={salvarCategoria}>
                            <div className="input-group">
                                <label htmlFor="nome">Nome</label>
                                <input
                                    id="nome"
                                    value={form.nome}
                                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    placeholder="Ex: Motor"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="descricao">Descrição</label>
                                <input
                                    id="descricao"
                                    value={form.descricao}
                                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                    placeholder="Que tipo de peça entra nessa categoria?"
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button className="btn-primary" type="submit">
                                    {editandoId ? "Salvar alterações" : "Adicionar categoria"}
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
                        ) : categorias.length === 0 ? (
                            <div className="catalogo-empty">Nenhuma categoria cadastrada ainda.</div>
                        ) : (
                            <table className="catalogo-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Descrição</th>
                                        {podeGerenciar(usuario) && <th>Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {categorias.map((categoria) => (
                                        <tr key={categoria.id}>
                                            <td>{categoria.nome}</td>
                                            <td>{categoria.descricao}</td>
                                            {podeGerenciar(usuario) && (
                                                <td>
                                                    <div className="catalogo-acoes">
                                                        <button className="btn-secondary" onClick={() => abrirFormEdicao(categoria)}>
                                                            Editar
                                                        </button>
                                                        <button className="btn-danger" onClick={() => excluirCategoria(categoria.id)}>
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

export default Categorias;
