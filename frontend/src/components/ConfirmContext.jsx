import { createContext, useCallback, useContext, useRef, useState } from "react";
import "../css/Confirm.css";

// Modal de confirmação estilizado, substituindo o window.confirm() nativo
// do navegador (feio e sem a identidade visual do site) em todas as
// páginas. `confirm(mensagem)` devolve uma Promise<boolean> — mesma
// forma de usar do window.confirm original, só que assíncrona.
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [mensagem, setMensagem] = useState(null);
    const resolverRef = useRef(null);

    const confirm = useCallback((texto) => {
        setMensagem(texto);
        return new Promise((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    function responder(valor) {
        setMensagem(null);
        if (resolverRef.current) {
            resolverRef.current(valor);
            resolverRef.current = null;
        }
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {mensagem && (
                <div className="confirm-overlay" onClick={() => responder(false)}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <p>{mensagem}</p>
                        <div className="confirm-dialog-acoes">
                            <button className="btn-secondary" onClick={() => responder(false)}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={() => responder(true)}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const confirm = useContext(ConfirmContext);
    if (!confirm) {
        throw new Error("useConfirm precisa ser usado dentro de <ConfirmProvider>");
    }
    return confirm;
}
