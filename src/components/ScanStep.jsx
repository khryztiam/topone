import { useState } from 'react';
import { useKiosk } from '@/context/KioskContext';
import { supabase } from '@/lib/supabaseClient';
import styles from '@/styles/ScanStep.module.css';

export default function ScanStep() {
  const [sapid, setSapid] = useState('');
  const [loading, setLoading] = useState(false);
  const { setEmployee, setError } = useKiosk();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sapid.trim()) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/employee?sapid=${encodeURIComponent(sapid.trim())}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al verificar empleado');
        return;
      }

      setEmployee(data.employee, data.token);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <h2>Ingresa tu N° de empleado</h2>
      <p className={styles.hint}>Escanea tu credencial o escribe tu SAPID</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d+"
          value={sapid}
          onChange={(e) => setSapid(e.target.value)}
          placeholder="Ej: 12345678"
          autoFocus
          className={styles.input}
          disabled={loading}
          maxLength={20}
        />
        <button type="submit" className={styles.btn} disabled={loading || !sapid.trim()}>
          {loading ? 'Verificando...' : 'Continuar'}
        </button>
      </form>
    </div>
  );
}
