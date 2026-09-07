import { createContext, useCallback, useContext, useRef, useState } from "react";
import "../css/Toast.css";

// Notificação global no canto da tela, substituindo os alert() nativos
// do navegador (feios e bloqueantes) em todas as páginas. `showToast`
// fica disponível via useToast() em qualquer componente dentro do
// <ToastProvider> (montado uma vez em App.js).
const ToastContext = createContext(null);

let proximoId = 1;
const DURACAO_MS = 4000;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const remover = useCallback((id) => {
        setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
        clearTimeout(timers.current[id]);
        delete timers.current[id];
    }, []);

    const showToast = useCallback((mensagem, tipo = "info") => {
        const id = proximoId++;
        setToasts((atuais) => [...atuais, { id, mensagem, tipo }]);
        timers.current[id] = setTimeout(() => remover(id), DURACAO_MS);
    }, [remover]);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.tipo}`}
                        role="alert"
                        onClick={() => remover(toast.id)}
                    >
                        {toast.mensagem}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const showToast = useContext(ToastContext);
    if (!showToast) {
        throw new Error("useToast precisa ser usado dentro de <ToastProvider>");
    }
    return showToast;
}
