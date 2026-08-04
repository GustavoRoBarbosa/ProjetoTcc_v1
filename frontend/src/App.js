import { BrowserRouter, Routes, Route } from "react-router-dom"

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
import PrivateRoute from "./routes/PrivateRoute";

function App() {
  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/confirmar-email" element={<ConfirmarEmail />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        <Route path="/dashboard" element={
          <PrivateRoute>
          <Dashboard />
          </PrivateRoute>
          }
          />

        <Route path="/pecas" element={
          <PrivateRoute>
          <Pecas />
          </PrivateRoute>
          }
          />

        <Route path="/categorias" element={
          <PrivateRoute>
          <Categorias />
          </PrivateRoute>
          }
          />

        <Route path="/fornecedores" element={
          <PrivateRoute>
          <Fornecedores />
          </PrivateRoute>
          }
          />

        <Route path="/usuarios" element={
          <PrivateRoute>
          <Usuarios />
          </PrivateRoute>
          }
          />

        <Route path="/logs" element={
          <PrivateRoute>
          <Logs />
          </PrivateRoute>
          }
          />

      </Routes>

    </BrowserRouter>

  );
}
export default App;
