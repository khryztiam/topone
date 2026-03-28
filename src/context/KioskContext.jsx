import { createContext, useContext, useState, useCallback } from 'react';

const KioskContext = createContext(null);

// Estado inicial limpio para resetear entre votaciones
const INITIAL_STATE = {
  employee: null,   // { sapid, nombre, linea, cod_linea, grupo, photo_url }
  token: null,      // token volátil del session_tokens
  votes: {},        // { categoria: nominated_sapid }
  step: 'scan',     // 'scan' | 'confirm_employee' | 'vote' | 'success' | 'error'
  error: null,
};

export function KioskProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const setStep = useCallback((step) => {
    setState((prev) => ({ ...prev, step, error: null }));
  }, []);

  const setEmployee = useCallback((employee, token) => {
    setState((prev) => ({ ...prev, employee, token, step: 'vote' }));
  }, []);

  const setVote = useCallback((categoria, nominatedSapid) => {
    setState((prev) => ({
      ...prev,
      votes: { ...prev.votes, [categoria]: nominatedSapid },
    }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error, step: 'error' }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return (
    <KioskContext.Provider
      value={{ ...state, setStep, setEmployee, setVote, setError, reset }}
    >
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error('useKiosk debe usarse dentro de KioskProvider');
  return ctx;
}
