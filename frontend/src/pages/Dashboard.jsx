import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function Dashboard() {

    const navigate = useNavigate();

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    function sair() {

        localStorage.removeItem("usuario");

        navigate("/");
    }

    return (

        <div className="container">

            <Sidebar />

            <div className="content">

                <h1>Inicio</h1>

                <h2>
                    Bem-vindo, {usuario.nome}
                </h2>

                <p>
                    Tipo de usuário: {usuario.tipo}
                </p>

                <button onClick={sair}>
                    Sair
                </button>

            </div>

        </div>
    );
}

export default Dashboard;