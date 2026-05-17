import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {

    const usuario = localStorage.getItem("usuario");

    if (!usuario) {
        return <Navigate to="/" />;
    }

    return children;
}

export default PrivateRoute;