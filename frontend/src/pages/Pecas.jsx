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

const FORM_VAZIO = {
    codigo: "",
    nome: "",
    descricao: "",
    preco: "",
    quantidade_estoque: "",
    quantidade_minima: "",
    nivel_prioridade: "media",
    categoria: "",
    fornecedor: "",
};

function Pecas() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const gerencia = podeGerenciar(usuario);
    const showToast = useToast();
    const confirm = useConfirm();

    const [pecas, setPecas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);
    const [imagem, setImagem] = useState(null);

    async function carregarTudo() {
        setCarregando(true);
        try {
            const [pecasResp, categoriasResp, fornecedoresResp] = await Promise.all([
                api.get("pecas/"),
                api.get("categorias/"),
                api.get("fornecedores/"),
            ]);
            setPecas(pecasResp.data);
            setCategorias(categoriasResp.data);
            setFornecedores(fornecedoresResp.data);
        } catch (error) {
            console.log(error);
            showToast("Erro ao carregar o catálogo de peças", "error");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarTudo();
    }, []);

    function abrirFormNovo() {
        setForm(FORM_VAZIO);
        setImagem(null);
        setEditandoId(null);
        setMostrarForm(true);
    }

    function abrirFormEdicao(peca) {
        setForm({
            codigo: peca.codigo,
            nome: peca.nome,
            descricao: peca.descricao || "",
            preco: peca.preco,
            quantidade_estoque: peca.quantidade_estoque,
            quantidade_minima: peca.quantidade_minima,
            nivel_prioridade: peca.nivel_prioridade,
            categoria: peca.categoria || "",
            fornecedor: peca.fornecedor || "",
        });
        setImagem(null);
        setEditandoId(peca.id);
        setMostrarForm(true);
    }

    function fecharForm() {
        setMostrarForm(false);
        setEditandoId(null);
    }

    // A API recebe multipart/form-data (por causa do upload de imagem),
    // então montamos um FormData em vez de mandar um objeto JS puro.
    async function salvarPeca(e) {
        e.preventDefault();

        // Categoria, fornecedor e imagem são obrigatórios para toda peça
        // nova — é um catálogo pensado pro cliente ver, uma peça sem foto
        // ou sem saber a categoria/fornecedor não cumpre esse propósito
        // (regra espelhada no backend, ver catalogo/models.py). Na edição
        // não exigimos escolher uma imagem nova: se nada for selecionado,
        // a imagem já salva continua valendo.
        if (!form.categoria || !form.fornecedor) {
            showToast("Selecione a categoria e o fornecedor da peça.", "error");
            return;
        }
        if (!editandoId && !imagem) {
            showToast("Selecione uma imagem para a peça.", "error");
            return;
        }

        const dados = new FormData();
        dados.append("codigo", form.codigo);
        dados.append("nome", form.nome);
        dados.append("descricao", form.descricao);
        dados.append("preco", form.preco);
        dados.append("quantidade_estoque", form.quantidade_estoque);
        dados.append("quantidade_minima", form.quantidade_minima || 0);
        dados.append("nivel_prioridade", form.nivel_prioridade);
        dados.append("categoria", form.categoria);
        dados.append("fornecedor", form.fornecedor);
        if (imagem) dados.append("imagem", imagem);

        try {
            if (editandoId) {
                await api.patch(`pecas/${editandoId}/`, dados);
            } else {
                await api.post("pecas/", dados);
            }
            fecharForm();
            carregarTudo();
        } catch (error) {
            console.log(error);
            showToast("Erro ao salvar peça (confira o código, ele precisa ser único)", "error");
        }
    }

    async function excluirPeca(id) {
        if (!await confirm("Excluir esta peça do catálogo?")) return;
        try {
            await api.delete(`pecas/${id}/`);
            carregarTudo();
        } catch (error) {
            console.log(error);
            showToast("Erro ao excluir peça", "error");
        }
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-content">
                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <h1>Peças</h1>
                        <p>Catálogo de peças da oficina</p>
                    </div>
                </header>

                <main className="dashboard-main">
                    <div className="catalogo-toolbar">
                        <h2>{pecas.length} peça(s) cadastrada(s)</h2>
                        {gerencia && !mostrarForm && (
                            <button className="btn-primary" onClick={abrirFormNovo}>
                                + Nova peça
                            </button>
                        )}
                    </div>

                    {gerencia && mostrarForm && (
                        <form className="catalogo-form" onSubmit={salvarPeca}>
                            <div className="input-group">
                                <label htmlFor="codigo">Código</label>
                                <input
                                    id="codigo"
                                    value={form.codigo}
                                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                                    required
                                />
                            </div>
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
                                <label htmlFor="preco">Preço (R$)</label>
                                <input
                                    id="preco"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.preco}
                                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="estoque">Estoque</label>
                                <input
                                    id="estoque"
                                    type="number"
                                    min="0"
                                    value={form.quantidade_estoque}
                                    onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="estoqueMinimo">Estoque mínimo</label>
                                <input
                                    id="estoqueMinimo"
                                    type="number"
                                    min="0"
                                    value={form.quantidade_minima}
                                    onChange={(e) => setForm({ ...form, quantidade_minima: e.target.value })}
                                    placeholder="Abaixo disso, repor"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="prioridade">Prioridade</label>
                                <select
                                    id="prioridade"
                                    value={form.nivel_prioridade}
                                    onChange={(e) => setForm({ ...form, nivel_prioridade: e.target.value })}
                                    required
                                >
                                    <option value="alta">Alta</option>
                                    <option value="media">Média</option>
                                    <option value="baixa">Baixa</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label htmlFor="categoria">Categoria</label>
                                <select
                                    id="categoria"
                                    value={form.categoria}
                                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {categorias.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label htmlFor="fornecedor">Fornecedor</label>
                                <select
                                    id="fornecedor"
                                    value={form.fornecedor}
                                    onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {fornecedores.map((f) => (
                                        <option key={f.id} value={f.id}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label htmlFor="imagem">
                                    Imagem {editandoId && "(deixe em branco para manter a atual)"}
                                </label>
                                <input
                                    id="imagem"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setImagem(e.target.files[0])}
                                    required={!editandoId}
                                />
                            </div>
                            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                                <label htmlFor="descricao">Descrição</label>
                                <textarea
                                    id="descricao"
                                    rows={2}
                                    value={form.descricao}
                                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button className="btn-primary" type="submit">
                                    {editandoId ? "Salvar alterações" : "Cadastrar peça"}
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
                        ) : pecas.length === 0 ? (
                            <div className="catalogo-empty">Nenhuma peça cadastrada ainda.</div>
                        ) : (
                            <table className="catalogo-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Código</th>
                                        <th>Nome</th>
                                        <th>Categoria</th>
                                        <th>Fornecedor</th>
                                        <th>Preço</th>
                                        <th>Estoque</th>
                                        <th>Prioridade</th>
                                        {gerencia && <th>Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pecas.map((peca) => (
                                        <tr key={peca.id}>
                                            <td>
                                                {peca.imagem ? (
                                                    <img className="catalogo-thumb" src={peca.imagem} alt={peca.nome} />
                                                ) : (
                                                    <div className="catalogo-thumb" />
                                                )}
                                            </td>
                                            <td>{peca.codigo}</td>
                                            <td>{peca.nome}</td>
                                            <td>{peca.categoria_nome || "—"}</td>
                                            <td>{peca.fornecedor_nome || "—"}</td>
                                            <td>R$ {Number(peca.preco).toFixed(2)}</td>
                                            <td>
                                                {peca.quantidade_estoque}
                                                {peca.quantidade_estoque <= peca.quantidade_minima && (
                                                    <span className="badge badge-baixo-estoque" title={`Mínimo: ${peca.quantidade_minima}`}>
                                                        repor
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge badge-prioridade-${peca.nivel_prioridade}`}>
                                                    {peca.nivel_prioridade}
                                                </span>
                                            </td>
                                            {gerencia && (
                                                <td>
                                                    <div className="catalogo-acoes">
                                                        <button className="btn-secondary" onClick={() => abrirFormEdicao(peca)}>
                                                            Editar
                                                        </button>
                                                        <button className="btn-danger" onClick={() => excluirPeca(peca.id)}>
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

export default Pecas;
