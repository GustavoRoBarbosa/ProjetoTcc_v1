import { BrowserRouter, Routes, Route } from "react-router-dom"

import Loja from "./pages/Loja";
import LojaProduto from "./pages/LojaProduto";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import ConfirmarEmail from "./pages/ConfirmarEmail";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Dashboard from "./pages/Dashboard";
import Pecas from "./pages/Pecas";
import Categorias from "./pages/Categorias";
import Fornecedores from "./pages/Fornecedores";
import Usuarios from "./pages/Usuarios";
import Logs from "./pages/Logs";
import ContaCliente from "./pages/ContaCliente";
import HistoricoCompras from "./pages/HistoricoCompras";
import Carrinho from "./pages/Carrinho";
import PrivateRoute from "./routes/PrivateRoute";

function App() {
  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Loja />} />
        <Route path="/produto/:id" element={<LojaProduto />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/confirmar-email" element={<ConfirmarEmail />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        {/* Área do cliente — qualquer usuário logado entra, sem
            restrição de tipo (é a área "padrão" de quem compra). */}
        <Route path="/minha-conta" element={
          <PrivateRoute>
          <ContaCliente />
          </PrivateRoute>
          }
          />

        <Route path="/historico-compras" element={
          <PrivateRoute>
          <HistoricoCompras />
          </PrivateRoute>
          }
          />

        <Route path="/carrinho" element={
          <PrivateRoute>
          <Carrinho />
          </PrivateRoute>
          }
          />

        {/* Telas de gestão — apenasEquipe manda cliente de volta pra
            /minha-conta em vez de mostrar essas telas (ver PrivateRoute.jsx). */}
        <Route path="/dashboard" element={
          <PrivateRoute apenasEquipe>
          <Dashboard />
          </PrivateRoute>
          }
          />

        <Route path="/pecas" element={
          <PrivateRoute apenasEquipe>
          <Pecas />
          </PrivateRoute>
          }
          />

        <Route path="/categorias" element={
          <PrivateRoute apenasEquipe>
          <Categorias />
          </PrivateRoute>
          }
          />

        <Route path="/fornecedores" element={
          <PrivateRoute apenasEquipe>
          <Fornecedores />
          </PrivateRoute>
          }
          />

        <Route path="/usuarios" element={
          <PrivateRoute apenasEquipe>
          <Usuarios />
          </PrivateRoute>
          }
          />

        <Route path="/logs" element={
          <PrivateRoute apenasEquipe>
          <Logs />
          </PrivateRoute>
          }
          />

      </Routes>

    </BrowserRouter>

  );
}
export default App;
